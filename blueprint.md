# Lotto Number Generator

## Overview

This is a simple web application that generates random lottery numbers. Users can click a button to get a set of 6 unique numbers between 1 and 45. The application is built using modern web standards, including Web Components for the UI elements.

## Design and Features

*   **Aesthetics:** The application has a clean and modern design with a visually balanced layout. It uses a vibrant color palette and a subtle background texture to create a premium feel.
*   **Responsiveness:** The layout is fully responsive and works on both desktop and mobile devices.
*   **Web Components:** The lottery numbers are displayed using a custom `<lotto-ball>` element, which encapsulates the styling and behavior of a single lottery ball.
*   **Interactivity:** A "Generate Numbers" button triggers the lottery number generation. The button has a "glow" effect on interaction.
*   **Animation:** The lottery balls fade in when they are generated.
*   **Theme Support:** Users can toggle between Dark and Light modes. Their preference is persisted in the browser's local storage.

## Current Plan

*   **HTML:**
    *   Set up the basic structure of the application in `index.html`.
    *   Add a title, a button, and a container for the lottery numbers.
    *   Add a theme toggle button.
*   **CSS:**
    *   Style the main layout, button, and lottery balls in `style.css`.
    *   Implement the modern design principles outlined in the project guidelines.
    *   Add CSS variables for Light and Dark modes.
*   **JavaScript:**
    *   Create a `<lotto-ball>` web component in `main.js`.
    *   Implement the logic for generating and displaying the lottery numbers.
    *   Implement theme switching and persistence logic.
