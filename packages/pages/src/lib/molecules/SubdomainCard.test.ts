import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { edgeCaseModel, petstoreModel } from "../fixtures";
import SubdomainCard from "./SubdomainCard.svelte";

describe("SubdomainCard", () => {
	it("lists the bounded contexts that serve the subdomain", () => {
		const { workspace } = petstoreModel();
		const domain = [...workspace.domains.values()][0];
		const subdomain = [...domain.subdomains.values()][0];
		render(SubdomainCard, { subdomain });
		expect(screen.getByText("Served by")).toBeInTheDocument();
	});

	it("shows an empty state when no bounded context serves it", () => {
		const { workspace } = edgeCaseModel();
		const domain = workspace.domains.get("domain_with_subdomains");
		const orphan = domain?.subdomains.get("orphan_subdomain");
		if (!orphan) throw new Error("expected the orphan subdomain fixture");

		render(SubdomainCard, { subdomain: orphan });
		expect(
			screen.getByText("No bounded context serves this subdomain yet."),
		).toBeInTheDocument();
	});
});
