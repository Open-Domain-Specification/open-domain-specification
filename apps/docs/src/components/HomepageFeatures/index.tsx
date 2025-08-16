import Heading from "@theme/Heading";
import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

type FeatureItem = {
	title: string;
	src;
	description: ReactNode;
};

const FeatureList: FeatureItem[] = [
	{
		title: "🧩 Model What Matters",
		src: "/img/1.gif",
		description: (
			<>
				Traditional diagrams map systems. Open Domain Specification helps you
				model the domain itself — the things your business actually cares about.
				Cut through noise, focus on meaning.
			</>
		),
	},
	{
		title: "💬 One Language for All",
		src: "/img/2.gif",
		description: (
			<>
				Stop lost-in-translation moments. With ODS, business and tech share a
				ubiquitous language. Everyone sees the same model, everyone speaks the
				same words.
			</>
		),
	},
	{
		title: "🗺 Navigate Complexity",
		src: "/img/3.gif",
		description: (
			<>
				Big systems don’t need bigger diagrams — they need better maps. ODS
				makes boundaries and relationships visible so you can spot risks, align
				teams, and design with confidence.
			</>
		),
	},
];

function Feature({ title, src, description }: FeatureItem) {
	return (
		<div className={clsx("col col--4")}>
			<div className="text--center">
				<img className={styles.featureSvg} alt={"feature_img"} src={src} />
			</div>
			<div className="text--center padding-horiz--md">
				<Heading as="h3">{title}</Heading>
				<p>{description}</p>
			</div>
		</div>
	);
}

export default function HomepageFeatures(): ReactNode {
	return (
		<section className={styles.features}>
			<div className="container">
				<div className="row">
					{FeatureList.map((props, idx) => (
						<Feature key={idx} {...props} />
					))}
				</div>
			</div>
		</section>
	);
}
