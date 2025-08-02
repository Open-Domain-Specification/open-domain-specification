export type ZeroOrOne_ZeroOrOne = "|o--o|";
export type ZeroOrOne_ExactlyOne = "|o--||";
export type ZeroOrOne_ZeroOrMore = "|o--o{";
export type ZeroOrOne_OneOrMore = "|o--|{";
export type ExactlyOne_ZeroOrOne = "||--o|";
export type ExactlyOne_ExactlyOne = "||--||";
export type ExactlyOne_ZeroOrMore = "||--o{";
export type ExactlyOne_OneOrMore = "||--|{";
export type ZeroOrMore_ZeroOrOne = "}o--o|";
export type ZeroOrMore_ExactlyOne = "}o--||";
export type ZeroOrMore_ZeroOrMore = "}o--o{";
export type ZeroOrMore_OneOrMore = "}o--|{";
export type OneOrMore_ZeroOrOne = "}|--o|";
export type OneOrMore_ExactlyOne = "}|--||";
export type OneOrMore_ZeroOrMore = "}|--o{";
export type OneOrMore_OneOrMore = "}|--|{";

export type ZeroOrOne_ZeroOrOne_Dashed = "|o..o|";
export type ZeroOrOne_ExactlyOne_Dashed = "|o..||";
export type ZeroOrOne_ZeroOrMore_Dashed = "|o..o{";
export type ZeroOrOne_OneOrMore_Dashed = "|o..|{";
export type ExactlyOne_ZeroOrOne_Dashed = "||..o|";
export type ExactlyOne_ExactlyOne_Dashed = "||..||";
export type ExactlyOne_ZeroOrMore_Dashed = "||..o{";
export type ExactlyOne_OneOrMore_Dashed = "||..|{";
export type ZeroOrMore_ZeroOrOne_Dashed = "}o..o|";
export type ZeroOrMore_ExactlyOne_Dashed = "}o..||";
export type ZeroOrMore_ZeroOrMore_Dashed = "}o..o{";
export type ZeroOrMore_OneOrMore_Dashed = "}o..|{";
export type OneOrMore_ZeroOrOne_Dashed = "}|..o|";
export type OneOrMore_ExactlyOne_Dashed = "}|..||";
export type OneOrMore_ZeroOrMore_Dashed = "}|..o{";
export type OneOrMore_OneOrMore_Dashed = "}|..{";

export type EntityRelationType =
	| ZeroOrOne_ZeroOrOne
	| ZeroOrOne_ExactlyOne
	| ZeroOrOne_ZeroOrMore
	| ZeroOrOne_OneOrMore
	| ExactlyOne_ZeroOrOne
	| ExactlyOne_ExactlyOne
	| ExactlyOne_ZeroOrMore
	| ExactlyOne_OneOrMore
	| ZeroOrMore_ZeroOrOne
	| ZeroOrMore_ExactlyOne
	| ZeroOrMore_ZeroOrMore
	| ZeroOrMore_OneOrMore
	| OneOrMore_ZeroOrOne
	| OneOrMore_ExactlyOne
	| OneOrMore_ZeroOrMore
	| OneOrMore_OneOrMore

	// Dashed syntax using dots
	| ZeroOrOne_ZeroOrOne_Dashed
	| ZeroOrOne_ExactlyOne_Dashed
	| ZeroOrOne_ZeroOrMore_Dashed
	| ZeroOrOne_OneOrMore_Dashed
	| ExactlyOne_ZeroOrOne_Dashed
	| ExactlyOne_ExactlyOne_Dashed
	| ExactlyOne_ZeroOrMore_Dashed
	| ExactlyOne_OneOrMore_Dashed
	| ZeroOrMore_ZeroOrOne_Dashed
	| ZeroOrMore_ExactlyOne_Dashed
	| ZeroOrMore_ZeroOrMore_Dashed
	| ZeroOrMore_OneOrMore_Dashed
	| OneOrMore_ZeroOrOne_Dashed
	| OneOrMore_ExactlyOne_Dashed
	| OneOrMore_ZeroOrMore_Dashed
	| OneOrMore_OneOrMore_Dashed;

export enum RelationType {
	ZeroOrOne_ZeroOrOne = "|o--o|",
	ZeroOrOne_ExactlyOne = "|o--||",
	ZeroOrOne_ZeroOrMore = "|o--o{",
	ZeroOrOne_OneOrMore = "|o--|{",
	ExactlyOne_ZeroOrOne = "||--o|",
	ExactlyOne_ExactlyOne = "||--||",
	ExactlyOne_ZeroOrMore = "||--o{",
	ExactlyOne_OneOrMore = "||--|{",
	ZeroOrMore_ZeroOrOne = "}o--o|",
	ZeroOrMore_ExactlyOne = "}o--||",
	ZeroOrMore_ZeroOrMore = "}o--o{",
	ZeroOrMore_OneOrMore = "}o--|{",
	OneOrMore_ZeroOrOne = "}|--o|",
	OneOrMore_ExactlyOne = "}|--||",
	OneOrMore_ZeroOrMore = "}|--o{",
	OneOrMore_OneOrMore = "}|--|{",
	ZeroOrOne_ZeroOrOne_Dashed = "|o..o|",
	ZeroOrOne_ExactlyOne_Dashed = "|o..||",
	ZeroOrOne_ZeroOrMore_Dashed = "|o..o{",
	ZeroOrOne_OneOrMore_Dashed = "|o..|{",
	ExactlyOne_ZeroOrOne_Dashed = "||..o|",
	ExactlyOne_ExactlyOne_Dashed = "||..||",
	ExactlyOne_ZeroOrMore_Dashed = "||..o{",
	ExactlyOne_OneOrMore_Dashed = "||..|{",
	ZeroOrMore_ZeroOrOne_Dashed = "}o..o|",
	ZeroOrMore_ExactlyOne_Dashed = "}o..||",
	ZeroOrMore_ZeroOrMore_Dashed = "}o..o{",
	ZeroOrMore_OneOrMore_Dashed = "}o..|{",
	OneOrMore_ZeroOrOne_Dashed = "}|..o|",
	OneOrMore_ExactlyOne_Dashed = "}|..||",
	OneOrMore_ZeroOrMore_Dashed = "}|..o{",
	OneOrMore_OneOrMore_Dashed = "}|..|{",
}

export type EntityRelation = {
	id: string;
	target: string;
	relation: EntityRelationType;
	label?: string;
};
