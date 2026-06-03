# DETOX TIMER — Flip Clock Study Timer ⏳

DETOX TIMER is a minimalist, distraction-free productivity web application designed for students and developers. Whether you are grinding through long Accountancy problems or diving into deep coding sessions, this timer helps you maintain flow and track your progress locally. 

Built entirely in a **single HTML file** using React (via CDN) and CSS3, it requires no build steps, no backend, and works 100% offline.

## ✨ Key Features

* **3 Core Modes:** Pomodoro Timer, classic Stopwatch, and a live Flip Clock.
* **Mini Mode (Background Tracking):** Switch tabs without losing your timer. Active sessions smoothly shrink into a Picture-in-Picture (PiP) mini-card at the bottom-left of the screen.
* **Advanced Analytics Dashboard:** Visualizes your last 7 days of activity with dynamic SVG bar charts and tracks your Daily Goal progress.
* **Strict Mode:** Disables the pause button and requires confirmation to stop the timer, preventing accidental focus breaks.
* **100% Privacy (Offline First):** All study data and preferences are saved securely in your browser's `localStorage`.
* **Customization:** Includes Light, Dark, and Flip themes, along with 4 custom accent colors and a 12h/24h clock format toggle.
* **Audio Alerts:** Uses the built-in Web Audio API for clean, dependency-free notification sounds.

## 🚀 Tech Stack

* **Frontend:** React 18 (via CDN), Babel (Standalone)
* **Styling:** Pure CSS3 (Flexbox, Grid, CSS Variables for dynamic theming)
* **Storage:** Browser LocalStorage API
* **Graphics:** Custom inline SVGs (No external icon libraries used)

## 🛠️ How to Use

Since the entire application is contained within `index.html`, there is no installation required. 

1. Simply open the [Live Demo](#) *(https://nitronstudios.github.io/Detox-Timer/)* on your laptop or mobile browser.
2. Enter your subject, select your mode, and hit **START**.
3. All your data stays on your device.

## 💡 Why this project?

This project was built to explore React state management, complex CSS 3D transforms (for the flip animations), and fully functional data visualization (SVG charts) without relying on heavy node modules or external databases. It serves as a lightweight, highly optimized productivity tool..
