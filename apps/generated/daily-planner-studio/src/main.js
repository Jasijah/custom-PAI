import "./styles.css";

const screens = {
  home: `
    <main class="app-shell layout-dashboard">
      <header class="hero">
        <span class="eyebrow">Product concept</span>
        <h1>Daily Planner Studio</h1>
        <p>A warm daily planner app with a focus timer, mood check-in, and a progress overview.</p>
      </header>
      <section class="feature-grid">
        <article class="feature-card">
          <span class="feature-label">Today</span>
          <h2>Start with the most important thing</h2>
          <p>Lead with the most useful action, then support it with just enough context to keep moving.</p>
        </article>
        <article class="feature-card">
          <span class="feature-label">Focus</span>
          <h2>See momentum clearly</h2>
          <p>Use stronger type, warmer spacing, and a focused call to action so the concept feels ready to use.</p>
        </article>
      </section>
    </main>
  `,
  details: `
    <main class="app-shell layout-dashboard">
      <header class="hero compact">
        <span class="eyebrow">Details</span>
        <h1>Daily Planner details</h1>
        <p>A deeper screen for progress, metrics, and supporting context.</p>
      </header>
      <section class="detail-list">
        <article class="feature-card"><h2>Progress</h2><p>Show important progress without turning the screen into a dense admin table.</p></article>
        <article class="feature-card"><h2>History</h2><p>Give people enough context to understand what changed and what comes next.</p></article>
      </section>
    </main>
  `,
  settings: `
    <main class="app-shell layout-dashboard">
      <header class="hero compact">
        <span class="eyebrow">Settings</span>
        <h1>Daily Planner preferences</h1>
        <p>A simple preferences screen with a friendlier structure than a raw settings dump.</p>
      </header>
      <section class="settings-stack">
        <article class="feature-card"><h2>Notifications</h2><p>Control what matters and keep the rest quiet.</p></article>
        <article class="feature-card"><h2>Appearance</h2><p>Choose a calmer palette and layout that fits everyday use.</p></article>
      </section>
    </main>
  `,
};

const shell = document.querySelector("#app");

function navMarkup(current) {
  return ["home", "details", "settings"]
    .map(
      (screen) =>
        `<button class="nav-pill ${screen === current ? "active" : ""}" data-screen="${screen}">${screen[0].toUpperCase() + screen.slice(1)}</button>`,
    )
    .join("");
}

function render(screen) {
  shell.innerHTML = `
    <div class="builder-app-shell">
      <header class="builder-app-topbar">
        <div>
          <div class="builder-app-kicker">Generated in Clawdis</div>
          <h1>Daily Planner Studio</h1>
        </div>
        <nav class="builder-app-nav">${navMarkup(screen)}</nav>
      </header>
      <section class="builder-app-screen">${screens[screen] ?? screens.home}</section>
    </div>
  `;

  shell.querySelectorAll("[data-screen]").forEach((node) => {
    node.addEventListener("click", () =>
      render(node.getAttribute("data-screen") || "home"),
    );
  });
}

render("home");
console.log("Daily Planner Studio scaffold ready");
