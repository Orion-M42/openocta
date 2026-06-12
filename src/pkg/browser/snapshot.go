package browser

const snapshotScript = `() => {
  const lines = [];
  const url = location.href;
  const title = document.title || "";
  let ref = 0;
  const selectors = "a,button,input,textarea,select,[role=button],[role=link],[role=textbox],[contenteditable=true]";
  const nodes = document.querySelectorAll(selectors);
  for (const el of nodes) {
    if (!(el instanceof HTMLElement)) continue;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    ref += 1;
    el.setAttribute("data-openocta-ref", String(ref));
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    const name = (el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.innerText || el.value || "").replace(/\s+/g, " ").trim().slice(0, 120);
    const type = el.getAttribute("type") || "";
    lines.push("[ref=" + ref + "] <" + tag + (role ? " role=" + role : "") + (type ? " type=" + type : "") + "> " + name);
  }
  return { url, title, snapshot: lines.join("\n"), refCount: ref };
}`
