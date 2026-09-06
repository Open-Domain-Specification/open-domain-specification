import { Workspace } from "@open-domain-specification/core";

/**
 * An outpatient clinic, modelled blind: written from `packages/skill/skill`
 * and `apps/docs/docs` alone, without reading any of the other reference
 * workspaces under `models/`. See `DISCOVERY.md` for the interviews this
 * follows, and the card's Comments journal for every rule met on the way
 * (`boards/project-backlog/117-a-fifth-model-written-blind-in-an-unfamiliar-domain.md`).
 */
export const workspace = new Workspace("Outpatient Clinic", {
	description:
		"Referral, triage, scheduling and diagnostics for patients referred to an outpatient clinic by their GP.",
	version: "0.1.0",
});

const careDomain = workspace.addDomain("Outpatient Care", {
	description: "Everything involved in getting a GP-referred patient seen.",
});
const triageSubdomain = careDomain.addSubdomain("Referral Triage", {
	type: "core",
	description:
		"Deciding what happens to a referral once it arrives: accept it, ask for more information, or decline it.",
});
const schedulingSubdomain = careDomain.addSubdomain("Appointment Scheduling", {
	type: "supporting",
	description:
		"Turning an accepted case into a booked clinic slot, and keeping the record of clinics, slots, bookings and cancellations.",
});
const identitySubdomain = careDomain.addSubdomain("Patient Identity", {
	type: "supporting",
	description:
		"Knowing who a patient is, and what every other system that refers to them calls them.",
});

const triageTeam = workspace.addTeam("Triage Team");
const schedulingTeam = workspace.addTeam("Scheduling Team");
const recordsTeam = workspace.addTeam("Records Team");

// ---------------------------------------------------------------------------
// GP Practice System (external) -- sends referrals in its own message shape.
// ---------------------------------------------------------------------------

const gpPracticeBC = workspace.addBoundedContext("GP Practice System", {
	description:
		"The GP's own practice management system. Not ours to model inside: it sends referrals in its own message format, and every practice may run a different one.",
	external: true,
});

const gpReferralMessageSchema = gpPracticeBC.addSchema("GP Referral Message", {
	description: "The referral exactly as the practice system sends it.",
});
gpReferralMessageSchema.addAttribute("referralReference", {
	type: "string",
	identity: true,
	description: "The practice system's own reference for this referral.",
});
gpReferralMessageSchema.addAttribute("gpPatientNumber", {
	type: "string",
	description: "The patient, by the GP's own patient number.",
});
gpReferralMessageSchema.addAttribute("requestedSpecialty", { type: "string" });
gpReferralMessageSchema.addAttribute("urgency", { type: "string" });
gpReferralMessageSchema.addAttribute("clinicalSummary", { type: "string" });

const gpPracticeInterfaceSvc = gpPracticeBC.addService(
	"Practice System Interface",
	{
		type: "application",
		description: "What the practice system publishes to us.",
	},
);
const referralSubmittedEvent = gpPracticeInterfaceSvc.provides(
	"Referral Submitted",
	{
		type: "event",
		pattern: "published-language",
		description:
			"A referral has been sent by the GP's practice system, in its own message format.",
		schema: gpReferralMessageSchema,
	},
);

// ---------------------------------------------------------------------------
// Laboratory (external) -- takes an order, answers with a result later.
// ---------------------------------------------------------------------------

const laboratoryBC = workspace.addBoundedContext("Laboratory", {
	description:
		"The clinic's contracted laboratory service. Takes a test order and answers with a result later, in its own report format. Not ours to model inside.",
	external: true,
});

const testOrderRequestSchema = laboratoryBC.addSchema("Test Order Request", {
	description: "The order, in the lab's own terms.",
});
testOrderRequestSchema.addAttribute("orderReference", {
	type: "string",
	identity: true,
});
testOrderRequestSchema.addAttribute("testCode", { type: "string" });
testOrderRequestSchema.addAttribute("clinicalNotes", {
	type: "string",
	optional: true,
});

const testOrderAcceptedSchema = laboratoryBC.addSchema("Test Order Accepted", {
	description: "The lab's acknowledgement that it has taken the order.",
});
testOrderAcceptedSchema.addAttribute("orderReference", {
	type: "string",
	identity: true,
});

const labResultMessageSchema = laboratoryBC.addSchema("Lab Result Message", {
	description: "The result, in the lab's own report format.",
});
labResultMessageSchema.addAttribute("orderReference", {
	type: "string",
	identity: true,
});
labResultMessageSchema.addAttribute("resultCode", { type: "string" });
labResultMessageSchema.addAttribute("reportText", { type: "string" });

const labInterfaceSvc = laboratoryBC.addService("Lab Interface", {
	type: "application",
	description: "What the lab offers us, and what it publishes back.",
});
const orderTestOp = labInterfaceSvc.provides("Order Test", {
	type: "operation",
	pattern: "open-host-service",
	description: "Takes a test order, in the lab's own request shape.",
	schema: testOrderRequestSchema,
	returns: testOrderAcceptedSchema,
});
const testResultReportedEvent = labInterfaceSvc.provides(
	"Test Result Reported",
	{
		type: "event",
		pattern: "published-language",
		description: "A result is ready, reported in the lab's own format.",
		schema: labResultMessageSchema,
	},
);

// ---------------------------------------------------------------------------
// Clinical Coding Regulator (external) -- publishes a standard, calls nobody.
// ---------------------------------------------------------------------------

const regulatorBC = workspace.addBoundedContext("Clinical Coding Regulator", {
	description:
		"Publishes the national clinical coding standard every clinical record must follow. Offers nothing to call: only the standard itself, as data.",
	external: true,
});

const clinicalCodeVO = regulatorBC.addValueObject("Clinical Code", {
	description:
		"A single code from the current published coding standard, and the version of the standard it was taken from.",
});
const clinicalCodeCodeAttr = clinicalCodeVO.addAttribute("code", {
	type: "string",
});
clinicalCodeVO.addAttribute("codeSetVersion", { type: "string" });
clinicalCodeVO
	.addInvariant("Code Belongs To The Published Standard", {
		description:
			"A clinical code is only ever one the regulator's current coding standard actually lists.",
	})
	.constrains(clinicalCodeCodeAttr);

// ---------------------------------------------------------------------------
// Patient Records -- who our patients are, and what every system calls them.
// ---------------------------------------------------------------------------

const recordsBC = workspace.addBoundedContext("Patient Records", {
	description:
		"Holds who our patients are, and what every outside system that refers to them calls them.",
	subdomains: [identitySubdomain],
});
recordsBC.ownedBy(recordsTeam);

const patientSummarySchema = recordsBC.addSchema("Patient Summary", {
	description:
		"What Records answers with when another part of the clinic looks a patient up.",
});
patientSummarySchema.addAttribute("patientId", { type: "string", identity: true });
patientSummarySchema.addAttribute("fullName", { type: "string" });
patientSummarySchema.addAttribute("dateOfBirth", { type: "string" });

const patientLookupRequestSchema = recordsBC.addSchema(
	"Patient Lookup Request",
	{ description: "Which patient is being asked for." },
);
patientLookupRequestSchema.addAttribute("patientId", { type: "string" });

const patientDetailsSchema = recordsBC.addSchema("Patient Details", {
	description: "What is known about a new patient when they are first registered.",
});
patientDetailsSchema.addAttribute("fullName", { type: "string" });
patientDetailsSchema.addAttribute("dateOfBirth", { type: "string" });

const gpReferenceDetailsSchema = recordsBC.addSchema("GP Reference Details", {
	description: "A patient's GP practice number, to be linked to our own record.",
});
gpReferenceDetailsSchema.addAttribute("patientId", { type: "string" });
gpReferenceDetailsSchema.addAttribute("gpPatientNumber", {
	type: "string",
	identifies: gpPracticeBC,
});

const labReferenceDetailsSchema = recordsBC.addSchema("Lab Reference Details", {
	description: "A patient's lab reference, to be linked to our own record.",
});
labReferenceDetailsSchema.addAttribute("patientId", { type: "string" });
labReferenceDetailsSchema.addAttribute("labPatientReference", {
	type: "string",
	identifies: laboratoryBC,
});

const patientRecordAgg = recordsBC.addAggregate("Patient Record", {
	description: "One patient, and every outside reference we hold for them.",
});
const patientEntity = patientRecordAgg.addRootEntity("Patient", {
	description: "Somebody the clinic has, or will, care for.",
});
patientEntity.addAttribute("patientId", { type: "string", identity: true });
patientEntity.addAttribute("fullName", { type: "string" });
patientEntity.addAttribute("dateOfBirth", { type: "string" });

const externalIdentifierEntity = patientRecordAgg.addEntity(
	"External Identifier",
	{
		description:
			"One outside system's own reference for this patient. Kinds say which system and hold that system's reference.",
	},
);
externalIdentifierEntity.addAttribute("externalIdentifierId", {
	type: "string",
	identity: true,
});
patientEntity.includes(externalIdentifierEntity, "is known elsewhere as", "*");

const gpPracticeReferenceEntity = patientRecordAgg.addEntity(
	"GP Practice Reference",
	{
		description: "This patient's number in a GP's own practice system.",
		specialises: externalIdentifierEntity,
	},
);
gpPracticeReferenceEntity.addAttribute("reference", {
	type: "string",
	identifies: gpPracticeBC,
});

const labReferenceEntity = patientRecordAgg.addEntity("Lab Reference", {
	description: "This patient's reference at the laboratory.",
	specialises: externalIdentifierEntity,
});
labReferenceEntity.addAttribute("reference", {
	type: "string",
	identifies: laboratoryBC,
});

const registerPatientOp = patientRecordAgg.provides("Register Patient", {
	type: "operation",
	description:
		"Creates the record for a patient the clinic has not seen before. Called by the records officer, or on the records officer's behalf when a referral names a patient not yet known.",
	schema: patientDetailsSchema,
	returns: patientSummarySchema,
});
const patientRegisteredEvent = patientRecordAgg.provides("Patient Registered", {
	type: "event",
	description: "A new patient has been added to Records.",
	schema: patientDetailsSchema,
});
registerPatientOp.raises(patientRegisteredEvent);

const linkGpPracticeReferenceOp = patientRecordAgg.provides(
	"Link GP Practice Reference",
	{
		type: "operation",
		description:
			"Records that a GP practice system knows this patient by a given number. Called by the records officer while matching a referral to a patient.",
		schema: gpReferenceDetailsSchema,
	},
);
const linkLabReferenceOp = patientRecordAgg.provides("Link Lab Reference", {
	type: "operation",
	description:
		"Records that the laboratory knows this patient by a given reference. Called by the records officer.",
	schema: labReferenceDetailsSchema,
});

recordsBC
	.addInvariant("One External Reference Per System", {
		description:
			"A patient never holds two references from the same outside system -- if a second one turns up, it is a mistake to catch, not a second identity to keep.",
		precondition: true,
	})
	.constrains(
		gpPracticeReferenceEntity,
		labReferenceEntity,
		linkGpPracticeReferenceOp,
		linkLabReferenceOp,
	);

const patientDirectorySvc = recordsBC.addService("Patient Directory", {
	type: "application",
	description: "Fronts Records for the rest of the clinic.",
});
const getPatientSummaryOp = patientDirectorySvc.provides("Get Patient Summary", {
	type: "operation",
	pattern: "open-host-service",
	description: "Looks a patient up by their internal id.",
	schema: patientLookupRequestSchema,
	returns: patientSummarySchema,
});

recordsBC.addTerm("Patient", {
	definition: "Somebody the clinic has, or will, care for.",
	embodiedBy: patientEntity,
});
recordsBC.addTerm("External Identifier", {
	definition:
		"The reference an outside system -- a GP practice, the lab -- uses for one of our patients.",
	embodiedBy: externalIdentifierEntity,
});

// ---------------------------------------------------------------------------
// Triage -- decides accept, more information, or decline; may hand a case to
// a consultant.
// ---------------------------------------------------------------------------

const triageBC = workspace.addBoundedContext("Triage", {
	description:
		"Turns a GP referral into a case of our own, decides whether to accept, ask for more information, or decline it, and may hand an accepted case to a consultant.",
	subdomains: [triageSubdomain],
});
triageBC.ownedBy(triageTeam);

const referralDetailsSchema = triageBC.addSchema("Referral Details", {
	description:
		"A referral, translated out of the GP practice system's own shape into ours.",
});
referralDetailsSchema.addAttribute("gpReferralReference", {
	type: "string",
	identifies: gpPracticeBC,
});
referralDetailsSchema.addAttribute("requestedSpecialty", { type: "string" });
referralDetailsSchema.addAttribute("urgency", { type: "string" });
referralDetailsSchema.addAttribute("clinicalSummary", { type: "string" });

const referralAcceptedDetailsSchema = triageBC.addSchema(
	"Referral Accepted Details",
	{ description: "Which case was accepted, and for which patient." },
);

const informationRequestDetailsSchema = triageBC.addSchema(
	"Information Request Details",
	{ description: "What further information triage is asking the GP for." },
);
informationRequestDetailsSchema.addAttribute("details", { type: "string" });

const consultantAssignmentDetailsSchema = triageBC.addSchema(
	"Consultant Assignment Details",
	{ description: "Which consultant an accepted case has been handed to." },
);
consultantAssignmentDetailsSchema.addAttribute("consultantId", {
	type: "string",
});

const labTestRequestDetailsSchema = triageBC.addSchema(
	"Lab Test Request Details",
	{ description: "The test triage wants run, in our own terms." },
);
labTestRequestDetailsSchema.addAttribute("testCode", { type: "string" });

const labResultDetailsSchema = triageBC.addSchema("Lab Result Details", {
	description: "A lab result, translated out of the lab's own report shape into ours.",
});
labResultDetailsSchema.addAttribute("resultCode", { type: "string" });

const patientHistoryCheckRequestSchema = triageBC.addSchema(
	"Patient History Check Request",
	{ description: "Which patient the assessment needs to know about." },
);

const referralCaseAgg = triageBC.addAggregate("Referral Case", {
	description: "One referral, from the moment it becomes a case of ours.",
});
const referralEntity = referralCaseAgg.addRootEntity("Referral", {
	description: "A GP referral, once it is a case of ours rather than the GP's message.",
});
referralEntity.addAttribute("referralId", { type: "string", identity: true });
const referralPatientIdAttr = referralEntity.addAttribute("patientId", {
	type: "string",
	optional: true,
	identifies: patientEntity,
	description: "Set once Records has matched this referral to one of our patients.",
});
referralEntity.addAttribute("gpReferralReference", {
	type: "string",
	identifies: gpPracticeBC,
});
referralEntity.addAttribute("requestedSpecialty", { type: "string" });
referralEntity.addAttribute("urgency", { type: "string" });
referralEntity.addAttribute("clinicalSummary", { type: "string" });
const referralStatusAttr = referralEntity.addAttribute("status", {
	type: "string",
});
const referralDiagnosisCodeAttr = referralEntity.addAttribute("diagnosisCode", {
	type: "ClinicalCode",
	optional: true,
	valueobject: clinicalCodeVO,
});
referralEntity.addAttribute("assignedConsultantId", {
	type: "string",
	optional: true,
});
referralEntity.addAttribute("labOrderReference", {
	type: "string",
	optional: true,
	identifies: laboratoryBC,
});
referralEntity.addAttribute("labResultCode", {
	type: "string",
	optional: true,
});
// No `uses` relation to diagnosisCode: a relation never crosses a bounded
// context (`cross-context-relation`), and Clinical Code belongs to the
// regulator's context. The attribute's own `valueobject` link is what
// borrowing a conformed-to context's value looks like; only a same-context
// value can also carry a relation on the map.

const registerReferralOp = referralCaseAgg.provides("Register Referral", {
	type: "operation",
	description: "Creates a case of our own from a referral the GP practice system sent.",
	schema: referralDetailsSchema,
});
const referralRegisteredEvent = referralCaseAgg.provides("Referral Registered", {
	type: "event",
	pattern: "published-language",
	description: "A referral has become a case of ours.",
	schema: referralDetailsSchema,
});
registerReferralOp.raises(referralRegisteredEvent);

const acceptReferralOp = referralCaseAgg.provides("Accept Referral", {
	type: "operation",
	description:
		"Called by the triage nurse once she is satisfied the case should go ahead.",
	returns: referralAcceptedDetailsSchema,
});
const referralAcceptedEvent = referralCaseAgg.provides("Referral Accepted", {
	type: "event",
	pattern: "published-language",
	description: "A case has been accepted and is ready to be scheduled.",
	schema: referralAcceptedDetailsSchema,
});
acceptReferralOp.raises(referralAcceptedEvent);

const requestMoreInformationOp = referralCaseAgg.provides(
	"Request More Information",
	{
		type: "operation",
		internal: true,
		description:
			"Called by the triage nurse when the referral does not yet say enough to decide.",
		schema: informationRequestDetailsSchema,
	},
);
const moreInformationRequestedEvent = referralCaseAgg.provides(
	"More Information Requested",
	{
		type: "event",
		internal: true,
		description:
			"Triage has asked the GP for more information before it can decide. Only triage itself tracks this.",
		schema: informationRequestDetailsSchema,
	},
);
requestMoreInformationOp.raises(moreInformationRequestedEvent);

const declineReferralOp = referralCaseAgg.provides("Decline Referral", {
	type: "operation",
	description: "Called by the triage nurse when the referral is not taken up.",
});
const referralDeclinedEvent = referralCaseAgg.provides("Referral Declined", {
	type: "event",
	description: "A referral has been declined.",
});
declineReferralOp.raises(referralDeclinedEvent);

const assignConsultantOp = referralCaseAgg.provides("Assign Consultant", {
	type: "operation",
	description:
		"Called by the triage nurse to hand a complicated accepted case to a consultant.",
	schema: consultantAssignmentDetailsSchema,
});
const caseAssignedToConsultantEvent = referralCaseAgg.provides(
	"Case Assigned To Consultant",
	{
		type: "event",
		description: "An accepted case has been handed to a named consultant.",
		schema: consultantAssignmentDetailsSchema,
	},
);
assignConsultantOp.raises(caseAssignedToConsultantEvent);

const recordLabResultOp = referralCaseAgg.provides("Record Lab Result", {
	type: "operation",
	description:
		"Folds a lab result, already translated into our own terms, into the case.",
	schema: labResultDetailsSchema,
});

referralCaseAgg
	.addInvariant("Status Moves Forward Only", {
		description:
			"A referral's status only ever moves on -- once accepted or declined, triage's other decisions no longer apply to it.",
	})
	.constrains(
		referralStatusAttr,
		acceptReferralOp,
		declineReferralOp,
		requestMoreInformationOp,
	);

referralCaseAgg
	.addInvariant("Accepted Referral Carries A Code", {
		description:
			"Once a referral is accepted it always carries a diagnosis code from the current coding standard.",
	})
	.constrains(referralDiagnosisCodeAttr, acceptReferralOp);

triageBC
	.addInvariant("One Active Referral Per Patient", {
		description:
			"A patient never has more than one active referral open with us at a time.",
		precondition: true,
	})
	.constrains(referralPatientIdAttr, registerReferralOp);

const triageAssessmentSvc = triageBC.addService("Triage Assessment", {
	type: "domain",
	description:
		"The clinical decision logic a referral is judged against. The nurse's own account is that the assessment itself calls out to Records for what is already known about the patient -- not an application service fronting the call -- so that is what is modelled here, even though a domain service is not meant to call outside its own context.",
});
triageAssessmentSvc.provides("Check Patient History", {
	type: "operation",
	description: "Checks what Records already holds for this referral's patient.",
	schema: patientHistoryCheckRequestSchema,
	returns: patientSummarySchema,
});
triageAssessmentSvc.consumes(getPatientSummaryOp, { pattern: "conformist" });

const referralIntakeSvc = triageBC.addService("Referral Intake", {
	type: "application",
	description:
		"Takes what the GP's practice system sends and turns it into a case of our own.",
});
const registerReferralOnSubmissionPolicy = triageBC.addPolicy(
	"Register Referral On Submission",
	{
		description: "Every submitted referral becomes a case of ours.",
		on: [referralSubmittedEvent],
		issues: [registerReferralOp],
	},
);
referralIntakeSvc.consumes(referralSubmittedEvent, {
	pattern: "anti-corruption-layer",
	by: [registerReferralOnSubmissionPolicy],
});

const labOrderingSvc = triageBC.addService("Lab Ordering", {
	type: "application",
	description:
		"Sends a patient for testing at the lab, and folds the result back into our own case once it is translated.",
});
labOrderingSvc.provides("Send Referral For Testing", {
	type: "operation",
	description: "Called once the assessment decides a test is needed.",
	schema: labTestRequestDetailsSchema,
});
labOrderingSvc.consumes(orderTestOp, { pattern: "anti-corruption-layer" });
const recordLabResultOnReceiptPolicy = triageBC.addPolicy(
	"Record Lab Result On Receipt",
	{
		description: "Every reported result is folded into the case it belongs to.",
		on: [testResultReportedEvent],
		issues: [recordLabResultOp],
	},
);
labOrderingSvc.consumes(testResultReportedEvent, {
	pattern: "anti-corruption-layer",
	by: [recordLabResultOnReceiptPolicy],
});

triageBC.downstreamOf(gpPracticeBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"The practice system's referral message is theirs to change; triage translates it into a case of our own on the way in.",
});
triageBC.downstreamOf(laboratoryBC, {
	upstreamRoles: ["open-host-service", "published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Triage orders tests through the lab's documented interface and translates its own report format into a case's own terms.",
});
triageBC.downstreamOf(regulatorBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
	description:
		"Every accepted referral's diagnosis must carry a code from the regulator's published coding standard, taken as it is published.",
});
triageBC.downstreamOf(recordsBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["conformist"],
	description:
		"Triage's assessment looks a patient up through Records' own directory and takes what it gets back as published.",
});

triageBC.addTerm("Referral", {
	definition: "A GP referral, once triage holds it as a case of its own.",
	aliases: ["Case"],
	embodiedBy: referralEntity,
});
triageBC.addTerm("Assessment", {
	definition: "The clinical decision logic a referral is judged against.",
	embodiedBy: triageAssessmentSvc,
});

// ---------------------------------------------------------------------------
// Scheduling -- clinics, slots, bookings and cancellations.
// ---------------------------------------------------------------------------

const schedulingBC = workspace.addBoundedContext("Scheduling", {
	description:
		"Turns an accepted case into a booked clinic slot, and keeps the record of clinics, slots, bookings and cancellations.",
	subdomains: [schedulingSubdomain],
});
schedulingBC.ownedBy(schedulingTeam);

const slotOfferRequestSchema = schedulingBC.addSchema("Slot Offer Request", {
	description: "Which accepted case, and which patient, is being offered a slot.",
});
slotOfferRequestSchema.addAttribute("referralId", {
	type: "string",
	identifies: referralEntity,
});
slotOfferRequestSchema.addAttribute("patientId", {
	type: "string",
	identifies: patientEntity,
});

const bookingConfirmedSchema = schedulingBC.addSchema("Booking Confirmed", {
	description: "The patient took the offered slot.",
});
bookingConfirmedSchema.addAttribute("bookingId", {
	type: "string",
	identity: true,
});
bookingConfirmedSchema.addAttribute("slotId", { type: "string" });
bookingConfirmedSchema.addAttribute("startTime", { type: "string" });

const patientWaitlistedSchema = schedulingBC.addSchema("Patient Waitlisted", {
	description:
		"The offered slot did not suit the patient, so they were put on the waiting list for a better one instead. Something happened here, just not a booking -- the model has no shape for a second thing that happened, so this is carried as a rejection for want of anywhere better (see DISCOVERY.md).",
});
patientWaitlistedSchema.addAttribute("bookingId", {
	type: "string",
	identity: true,
});
patientWaitlistedSchema.addAttribute("note", { type: "string", optional: true });

const bookingCancelledSchema = schedulingBC.addSchema("Booking Cancelled Details", {
	description: "Which booking was cancelled, and why.",
});
bookingCancelledSchema.addAttribute("reason", { type: "string", optional: true });

const cancellationRequestSchema = schedulingBC.addSchema(
	"Cancellation Request",
	{ description: "Which booking is being cancelled." },
);
cancellationRequestSchema.addAttribute("reason", { type: "string", optional: true });

const clinicScheduleAgg = schedulingBC.addAggregate("Clinic Schedule", {
	description: "One clinic session and its bookable slots.",
});
const clinicSessionEntity = clinicScheduleAgg.addRootEntity("Clinic Session", {
	description: "A run of appointments on a given day with a given clinician.",
});
clinicSessionEntity.addAttribute("sessionId", { type: "string", identity: true });
clinicSessionEntity.addAttribute("clinicianName", { type: "string" });
clinicSessionEntity.addAttribute("date", { type: "string" });
clinicSessionEntity.addAttribute("specialty", { type: "string" });

const slotEntity = clinicScheduleAgg.addEntity("Slot", {
	description: "One bookable appointment time within a clinic session.",
});
slotEntity.addAttribute("slotId", { type: "string", identity: true });
slotEntity.addAttribute("startTime", { type: "string" });
const slotStatusAttr = slotEntity.addAttribute("status", { type: "string" });
clinicSessionEntity.includes(slotEntity, "offers", "1..*");

const bookingAgg = schedulingBC.addAggregate("Booking", {
	description: "One patient booked, or waitlisted, against a slot.",
});
const bookingEntity = bookingAgg.addRootEntity("Booking", {
	description: "A patient's claim on a slot, from an offer through to its outcome.",
});
bookingEntity.addAttribute("bookingId", { type: "string", identity: true });
bookingEntity.addAttribute("clinicSessionId", {
	type: "string",
	identifies: clinicSessionEntity,
});
bookingEntity.addAttribute("slotId", { type: "string", identifies: slotEntity });
bookingEntity.addAttribute("patientId", {
	type: "string",
	identifies: patientEntity,
});
bookingEntity.addAttribute("status", { type: "string" });

const bookingConfirmedEvent = bookingAgg.provides("Booking Confirmed", {
	type: "event",
	description: "A patient confirmed the slot they were offered.",
	schema: bookingConfirmedSchema,
});
const patientWaitlistedEvent = bookingAgg.provides("Patient Waitlisted", {
	type: "event",
	description: "A patient was put on the waiting list instead of taking the offered slot.",
	schema: patientWaitlistedSchema,
});

const cancelBookingOp = bookingAgg.provides("Cancel Booking", {
	type: "operation",
	description: "Called by the patient or the scheduler to give up a confirmed booking.",
	schema: cancellationRequestSchema,
});
const bookingCancelledEvent = bookingAgg.provides("Booking Cancelled", {
	type: "event",
	description: "A confirmed booking was cancelled.",
	schema: bookingCancelledSchema,
});
cancelBookingOp.raises(bookingCancelledEvent);

const schedulingDeskSvc = schedulingBC.addService("Scheduling Desk", {
	type: "application",
	description: "Offers the patient a slot once triage accepts their case.",
});
const offerSlotOp = schedulingDeskSvc.provides("Offer Slot", {
	type: "operation",
	description:
		"Offers the patient the next open slot for the case's specialty. The patient's answer is not a refusal either way -- see DISCOVERY.md for why the second outcome is carried under rejects.",
	schema: slotOfferRequestSchema,
	returns: bookingConfirmedSchema,
	rejects: [patientWaitlistedSchema],
});
offerSlotOp.raises(bookingConfirmedEvent, patientWaitlistedEvent);

const offerSlotOnAcceptancePolicy = schedulingBC.addPolicy(
	"Offer Slot On Acceptance",
	{
		description: "Every accepted case is immediately offered a slot.",
		on: [referralAcceptedEvent],
		issues: [offerSlotOp],
	},
);
schedulingDeskSvc.consumes(referralAcceptedEvent, {
	pattern: "conformist",
	by: [offerSlotOnAcceptancePolicy],
});

schedulingBC
	.addInvariant("Slot Offered Once", {
		description: "A slot is never offered to a second patient while it is already held.",
		precondition: true,
	})
	.constrains(slotStatusAttr, offerSlotOp);

const appointmentLifecycleProcess = schedulingBC.addProcess(
	"Appointment Lifecycle",
	{
		description:
			"Remembers a confirmed booking until either it is cancelled or the day of the appointment arrives; that is the whole of what a booking waits for.",
	},
);
appointmentLifecycleProcess.starts(bookingConfirmedEvent);
const appointmentDayDeadline = appointmentLifecycleProcess.addDeadline(
	"Appointment Day Reached",
	{
		description:
			"The clinic session's own date arrives with no cancellation received.",
		after: "until the day of the appointment",
	},
);
appointmentLifecycleProcess.ends(bookingCancelledEvent, appointmentDayDeadline);

schedulingBC.downstreamOf(triageBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
	description:
		"Scheduling reacts to triage's own accepted-case fact, taking it as published.",
});

schedulingBC.addTerm("Clinic Session", {
	definition: "A run of appointments on a given day with a given clinician.",
	embodiedBy: clinicSessionEntity,
});
schedulingBC.addTerm("Slot", {
	definition: "One bookable appointment time within a clinic session.",
	embodiedBy: slotEntity,
});
schedulingBC.addTerm("Booking", {
	definition: "A patient's claim on a slot.",
	embodiedBy: bookingEntity,
});
schedulingBC.addTerm("Waitlist", {
	definition:
		"Where a patient goes when an offered slot does not suit them, to wait for a better one.",
});

// ---------------------------------------------------------------------------
// Records learns of a new case once triage registers it.
// ---------------------------------------------------------------------------

const registerPatientOnReferralPolicy = recordsBC.addPolicy(
	"Register Patient On Referral",
	{
		description:
			"Every registered referral names a patient Records should know about, new or existing.",
		on: [referralRegisteredEvent],
		issues: [registerPatientOp],
	},
);
patientDirectorySvc.consumes(referralRegisteredEvent, {
	pattern: "conformist",
	by: [registerPatientOnReferralPolicy],
});
recordsBC.downstreamOf(triageBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
	description: "Records takes triage's own registered-case fact as published.",
});
