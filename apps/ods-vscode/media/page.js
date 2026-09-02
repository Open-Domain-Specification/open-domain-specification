(() => {
	// Inside the extension the host owns navigation; in the static site export
	// the same script runs with plain hrefs and no message bridge.
	const vscode =
		typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : undefined;

	const modal = document.getElementById("diagram-modal");
	const modalBody = modal?.querySelector(".modal-body");
	const openDiagramModal = (svg) => {
		if (!modal || !modalBody) return;
		modalBody.innerHTML = svg.outerHTML;
		modal.hidden = false;
	};
	const closeDiagramModal = () => {
		if (!modal || modal.hidden) return;
		modal.hidden = true;
		modalBody.innerHTML = "";
	};

	document.addEventListener("click", (event) => {
		const ref = event.target.closest("a.ref");
		if (ref && vscode) {
			event.preventDefault();
			vscode.postMessage({ type: "navigate", ref: ref.dataset.ref });
			return;
		}
		const button = event.target.closest("button[data-action]");
		if (button && vscode) {
			vscode.postMessage({ type: button.dataset.action });
			return;
		}
		const toc = event.target.closest("a[data-section]");
		if (toc) {
			event.preventDefault();
			document
				.getElementById(toc.dataset.section)
				?.scrollIntoView({ behavior: "smooth", block: "start" });
			return;
		}
		const diagramSvg = event.target.closest(".diagram .canvas svg");
		if (diagramSvg) {
			openDiagramModal(diagramSvg);
			return;
		}
		if (event.target.closest(".modal-backdrop, .modal-close")) {
			closeDiagramModal();
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") closeDiagramModal();
	});

	// Scroll to the element the ref pointed at, when it lives below the page's own element.
	const anchor =
		document.body.dataset.anchor ||
		(vscode ? "" : decodeURIComponent(location.hash.slice(1)));
	if (anchor) {
		const el = document.getElementById(anchor);
		if (el) {
			el.scrollIntoView({ block: "center" });
			el.classList.add("flash");
		}
	}

	// Highlight the section in view in the side navigation.
	const links = [...document.querySelectorAll("a[data-section]")];
	const sections = links
		.map((l) => document.getElementById(l.dataset.section))
		.filter(Boolean);
	if (sections.length) {
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort(
						(a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
					)[0];
				if (!visible) return;
				for (const l of links)
					l.classList.toggle("active", l.dataset.section === visible.target.id);
			},
			{ rootMargin: "-48px 0px -70% 0px" },
		);
		for (const s of sections) observer.observe(s);
	}
})();
