// Lightweight modal system.

const overlay = document.getElementById("modal-overlay");
const titleEl = document.getElementById("modal-title");
const bodyEl = document.getElementById("modal-body");
const actionsEl = document.getElementById("modal-actions");

export function openModal({ title, bodyHtml, buttons, onMount }) {
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  actionsEl.innerHTML = "";
  buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn" + (b.primary ? " btn-primary" : "");
    btn.textContent = b.label;
    btn.addEventListener("click", b.onClick);
    actionsEl.appendChild(btn);
  });
  overlay.hidden = false;
  if (onMount) onMount(bodyEl);
}

export function closeModal() {
  overlay.hidden = true;
  bodyEl.innerHTML = "";
}

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.hidden) closeModal();
});
