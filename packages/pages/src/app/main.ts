import { mount } from "svelte";
import "../../assets/codicons/codicon.css";
import "../../assets/site.css";
import "../../assets/page.css";
import App from "./App.svelte";
import { bootstrap } from "./host";

mount(App, {
	target: document.getElementById("app") ?? document.body,
	props: { initial: bootstrap() },
});
