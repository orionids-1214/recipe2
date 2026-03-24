document.addEventListener('DOMContentLoaded', () => {
    const recipeForm = document.getElementById('recipe-form');
    const extractButton = document.getElementById('extract-button');
    const youtubeUrlInput = document.getElementById('youtube-url');

    const historyList = document.getElementById('history-list');
    const tocList = document.getElementById('toc-list');
    const recipeTitle = document.getElementById('recipe-title');
    const ingredientsContent = document.getElementById('ingredients-content');
    const instructionsContent = document.getElementById('instructions-content');

    const backendEndpoint = 'https://extractrecipe-drppnw3lma-uc.a.run.app/extractRecipe';

    const clearInitialMessage = (element) => {
        const initialMessage = element.querySelector('.initial-message');
        if (initialMessage) {
            initialMessage.remove();
        }
    };

    recipeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const url = youtubeUrlInput.value;
        if (!url) {
            alert('YouTube URL을 입력해주세요.');
            return;
        }

        extractButton.disabled = true;
        extractButton.classList.add('loading');

        // Clear previous results
        tocList.innerHTML = '';
        ingredientsContent.innerHTML = '';
        instructionsContent.innerHTML = '';
        recipeTitle.style.display = 'none';

        try {
            const response = await fetch(backendEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            });

            if (!response.ok) {
                let errorText = `서버 오류: ${response.status}`;
                try {
                    const errorJson = await response.json();
                    errorText = errorJson.error || JSON.stringify(errorJson);
                } catch (e) {
                    errorText = await response.text();
                }
                throw new Error(errorText);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }
            if (Object.keys(data).length === 0) {
                throw new Error('추출된 내용이 없습니다. 다른 URL을 시도해보세요.');
            }

            // --- INTELLIGENT FRONTEND PARSING LOGIC ---
            let ingredients = data.ingredients || [];
            let instructions = data.instructions || [];

            const separatorKeywords = ['만드는 법', '조리법', '만들기', '순서', 'instructions', 'steps', 'recipe'];
            let separatorIndex = -1;

            // Find separator in ingredients array
            for (let i = 0; i < ingredients.length; i++) {
                const line = ingredients[i].toLowerCase();
                if (separatorKeywords.some(keyword => line.includes(keyword))) {
                    separatorIndex = i;
                    break;
                }
            }

            // If a separator is found and instructions are empty, split the ingredients array
            if (separatorIndex !== -1 && instructions.length === 0) {
                instructions = ingredients.slice(separatorIndex);
                ingredients = ingredients.slice(0, separatorIndex);

                // Clean up the separator title from the new instructions array
                if (instructions.length > 0) {
                    const firstInstructionLine = instructions[0].toLowerCase();
                     if (separatorKeywords.some(keyword => firstInstructionLine.includes(keyword))) {
                        // A simple heuristic: if the line is short, it's likely just a title.
                        if (instructions[0].trim().length < 30) {
                            instructions.shift(); 
                        }
                    }
                }
            }
            // --- END OF PARSING LOGIC ---


            // Render TOC
            clearInitialMessage(tocList);
            const tocItem = document.createElement('a');
            tocItem.href = '#recipe-card';
            tocItem.textContent = data.title;
            tocList.appendChild(tocItem);

            // Render Title
            recipeTitle.textContent = data.title;
            recipeTitle.style.display = 'block';

            // Render Ingredients
            clearInitialMessage(ingredientsContent.parentElement);
            if (ingredients && ingredients.length > 0) {
                const list = document.createElement('ul');
                ingredients.forEach(ingredient => {
                    const item = document.createElement('li');
                    item.textContent = ingredient;
                    list.appendChild(item);
                });
                ingredientsContent.appendChild(list);
            } else {
                ingredientsContent.innerHTML = '<p>재료 정보가 없습니다.</p>';
            }

            // Render Instructions
            clearInitialMessage(instructionsContent.parentElement);
            if (instructions && instructions.length > 0) {
                const list = document.createElement('ol');
                instructions.forEach(instruction => {
                    const item = document.createElement('li');
                    item.textContent = instruction;
                    list.appendChild(item);
                });
                instructionsContent.appendChild(list);
            } else {
                instructionsContent.innerHTML = '<p>조리법 정보가 없습니다.</p>';
            }

            // Prepend to history
            clearInitialMessage(historyList);
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = data.title;
            historyItem.dataset.url = url;
            historyItem.addEventListener('click', () => {
                youtubeUrlInput.value = url;
                recipeForm.dispatchEvent(new Event('submit'));
            });
            historyList.prepend(historyItem);

        } catch (error) {
            alert(`오류 발생: ${error.message}`);
            // Restore initial messages on error
            if (!ingredientsContent.hasChildNodes()) {
                ingredientsContent.innerHTML = '<p class="initial-message">여기에 재료 목록이 표시됩니다.</p>';
            }
            if (!instructionsContent.hasChildNodes()) {
                instructionsContent.innerHTML = '<p class="initial-message">여기에 만드는 법이 순서대로 표시됩니다.</p>';
            }
        } finally {
            extractButton.disabled = false;
            extractButton.classList.remove('loading');
        }
    });
});