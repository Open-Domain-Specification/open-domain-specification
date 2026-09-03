# Swagger Petstore: brief

The Petstore is the demonstration reference for ODS, not a client. Its "organisation" is
the Swagger Petstore v3 OpenAPI example: a small shop that lists pets, takes orders for them,
reports how many are available, pending and sold, and has a legacy user store. It exists so
that every feature of the model can be shown once, in a domain everyone already knows.

## Who they are

A single pet shop with an API. Three teams: the Pet Shop Team looks after the catalogue and
the availability counts, the Orders Team takes orders and gets pets to their owners, and the
Platform Team runs the user store that nobody wants to touch.

## What they do

List pets with a category, photos, tags and a status (available, pending, sold). Take an
order for one pet in a quantity; approve it when the pet is available; deliver it. Report
counts by status. Register users and let them log in and out.

## Where the challenges are

The user store is the legacy: its status field is an untyped integer and login is a GET
with the password in the query string. Orders are anonymous by design, so there is nothing
to integrate between users and sales. Everything else is small enough to be modelled fully.

## What is asked for

A workspace that shows each element of the model at least once, with descriptions that say
why a choice was made, and that validates clean.
