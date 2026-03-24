# **Blueprint: YouTube Recipe Extractor**

## **Overview**

This document outlines the architecture, features, and development plan for the "YouTube Recipe Extractor," a web application designed to help users easily pull recipe information from YouTube videos. The application is built with modern, framework-less web technologies and leverages Firebase for backend services.

---

## **Project Outline**

### **1. Frontend**

*   **Technology:** HTML5, CSS3, Vanilla JavaScript (ESM)
*   **Core Concepts:**
    *   **Web Components:** The UI is built using custom elements for modularity and encapsulation (e.g., `<recipe-card>`, `<history-item>`).
    *   **Responsive Design:** The layout adapts to all screen sizes using modern CSS like container queries and logical properties.
    *   **Modern Styling:**
        *   **Font:** Noto Sans KR for clear Korean typography.
        *   **Color Palette:** Utilizes modern color spaces (`oklch`) for a vibrant and accessible UI. Key colors include a soft background, white cards, and strong accent colors for interactive elements.
        *   **Effects:** Subtle noise texture on the background, multi-layered drop shadows for depth, and "glow" effects on interactive elements.
        *   **Icons:** Font Awesome is used for intuitive iconography.
*   **Key Files:**
    *   `public/index.html`: Main application structure.
    *   `public/style.css`: All styling, organized with CSS layers (`@layer`).
    *   `public/main.js`: Main application logic, module imports, and component definitions.

### **2. Backend**

*   **Technology:** Firebase (Cloud Functions)
*   **Core Concepts:**
    *   **Serverless Function:** A Node.js function (`extractRecipe`) is deployed to Firebase Cloud Functions.
    *   **API Endpoint:** The function is triggered by an HTTP request from the frontend, taking a YouTube URL as a parameter.
    *   **Logic:** The function fetches video details (description, chapters) and uses a combination of heuristics and parsing to identify and structure the recipe ingredients and steps.
*   **Key Files:**
    *   `functions/index.js`: The backend Cloud Function code.
    *   `firebase.json`: Firebase project configuration, including Hosting and Functions setup.

### **3. Features**

*   **`Feature: URL Input and Validation`**
    *   A prominent input field for the user to paste a YouTube URL.
    *   Client-side validation to ensure the input is a valid URL format before sending.

*   **`Feature: Recipe Extraction with Loading State`**
    *   An "Extract Recipe" button triggers a `fetch` call to the backend Firebase Function.
    *   The button shows a loading spinner and is disabled during the extraction process.

*   **`Feature: Display Recipe`**
    *   The extracted recipe (title, ingredients, instructions, tips) is rendered dynamically on the page within a dedicated card.

*   **`Feature: History`**
    *   Previously extracted recipes are saved to the browser's `localStorage`.
    *   A "History" section displays a list of these past recipes, allowing the user to quickly view them again.

*   **`Feature: Table of Contents`**
    *   For longer recipes, a "Table of Contents" is automatically generated based on the recipe's sections (e.g., "Ingredients," "Instructions", "Tips"). This allows for quick navigation.

*   **`Feature: Responsive Design`**
    *   The entire interface is fully responsive, ensuring a seamless experience on desktops, tablets, and mobile devices.

*   **`Feature: Copy and Download`**
    *   Buttons to copy the recipe to the clipboard or download it as a text file.

---

## **Development Complete**

All planned features have been successfully implemented. The application is now fully functional and meets the initial requirements. The `blueprint.md` file serves as the final documentation for the project.
