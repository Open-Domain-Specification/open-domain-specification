CREATE TABLE `aggregate` (
	`ref` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`subdomain_id` text NOT NULL,
	`bounded_context_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subdomain_id`) REFERENCES `subdomain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bounded_context_id`) REFERENCES `bounded_context`(`bounded_context_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `aggregate_consumer` (
	`aggregate_ref` text NOT NULL,
	`aggregate_boundedcontext_ref` text NOT NULL,
	`consumable_ref` text NOT NULL,
	`consumable_boundedcontext_ref` text NOT NULL,
	`pattern` text NOT NULL,
	PRIMARY KEY(`aggregate_ref`, `consumable_ref`),
	FOREIGN KEY (`aggregate_ref`) REFERENCES `aggregate`(`ref`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aggregate_boundedcontext_ref`) REFERENCES `bounded_context`(`ref`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`consumable_ref`) REFERENCES `consumable`(`ref`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`consumable_boundedcontext_ref`) REFERENCES `bounded_context`(`ref`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bounded_context` (
	`ref` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`subdomain_id` text NOT NULL,
	`bounded_context_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subdomain_id`) REFERENCES `subdomain`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `consumable` (
	`ref` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`subdomain_id` text NOT NULL,
	`bounded_context_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`provider_type` text NOT NULL,
	`provider` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`type` text NOT NULL,
	`pattern` text NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subdomain_id`) REFERENCES `subdomain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bounded_context_id`) REFERENCES `bounded_context`(`bounded_context_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `service`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `domain` (
	`ref` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entity` (
	`ref` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`subdomain_id` text NOT NULL,
	`bounded_context_id` text NOT NULL,
	`aggregate_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`root` integer DEFAULT 0 NOT NULL,
	`type` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subdomain_id`) REFERENCES `subdomain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bounded_context_id`) REFERENCES `bounded_context`(`bounded_context_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aggregate_id`) REFERENCES `aggregate`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entity_relation` (
	`source` text NOT NULL,
	`target` text NOT NULL,
	`relation` text NOT NULL,
	`label` text NOT NULL,
	PRIMARY KEY(`source`, `target`, `relation`, `label`),
	FOREIGN KEY (`source`) REFERENCES `entity`(`ref`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target`) REFERENCES `entity`(`ref`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invariant` (
	`ref` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`subdomain_id` text NOT NULL,
	`bounded_context_id` text NOT NULL,
	`aggregate_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subdomain_id`) REFERENCES `subdomain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bounded_context_id`) REFERENCES `bounded_context`(`bounded_context_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aggregate_id`) REFERENCES `aggregate`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `service` (
	`ref` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`subdomain_id` text NOT NULL,
	`bounded_context_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subdomain_id`) REFERENCES `subdomain`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bounded_context_id`) REFERENCES `bounded_context`(`bounded_context_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `service_consumer` (
	`service_ref` text NOT NULL,
	`service_boundedcontext_ref` text NOT NULL,
	`consumable_ref` text NOT NULL,
	`consumable_boundedcontext_ref` text NOT NULL,
	`pattern` text NOT NULL,
	PRIMARY KEY(`service_ref`, `consumable_ref`),
	FOREIGN KEY (`service_ref`) REFERENCES `service`(`ref`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_boundedcontext_ref`) REFERENCES `bounded_context`(`ref`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`consumable_ref`) REFERENCES `consumable`(`ref`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`consumable_boundedcontext_ref`) REFERENCES `bounded_context`(`ref`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subdomain` (
	`ref` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domain`(`id`) ON UPDATE no action ON DELETE cascade
);
