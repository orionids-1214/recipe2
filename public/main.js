
document.addEventListener('DOMContentLoaded', () => {

  const recipeForm = document.getElementById('recipe-form');
  const extractButton = document.getElementById('extract-button');
  const youtubeUrlInput = document.getElementById('youtube-url');
  const recipeContentEl = document.getElementById('recipe-content');
  const historyListEl = document.getElementById('history-list');

  const API_ENDPOINT = 'https://asia-northeast3-orionids-app-52994581-a7885.cloudfunctions.net/extractRecipe';

  // --- Functions ---

  const showLoading = () => {
    extractButton.disabled = true;
    extractButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 추출 중...';
    recipeContentEl.innerHTML = '';
  };

  const hideLoading = () => {
    extractButton.disabled = false;
    extractButton.textContent = '레시피 추출';
  };

  const displayError = (message) => {
    recipeContentEl.innerHTML = `<div class="error-message">${message}</div>`;
  };

  const displayRecipes = (recipes) => {
    if (!recipes || recipes.length === 0) {
      displayError("레시피를 찾을 수 없습니다.");
      return;
    }
    const recipeHTML = recipes.map(recipe => `
      <div class="recipe-card">
        <h3>${recipe.title || '레시피'}</h3>
        <div class="recipe-section">
          <h4><i class="fas fa-carrot"></i> 재료</h4>
          <ul>
            ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
          </ul>
        </div>
        <div class="recipe-section">
          <h4><i class="fas fa-blender"></i> 만드는 법</h4>
          <ol>
            ${recipe.instructions.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>
      </div>
    `).join('');
    recipeContentEl.innerHTML = recipeHTML;
  };
  
  const saveToHistory = (url, title) => {
      let history = JSON.parse(localStorage.getItem('recipeHistory')) || [];
      // 중복 제거
      history = history.filter(item => item.url !== url);
      history.unshift({ url, title: title || url, date: new Date().toISOString() });
      // 최근 5개만 저장
      history = history.slice(0, 5); 
      localStorage.setItem('recipeHistory', JSON.stringify(history));
      loadHistory();
  };

  const loadHistory = () => {
      let history = JSON.parse(localStorage.getItem('recipeHistory')) || [];
      if (history.length === 0) {
          historyListEl.innerHTML = '<p>추출 기록이 없습니다.</p>';
          return;
      }
      historyListEl.innerHTML = history.map(item => 
          `<div class="history-item" data-url="${item.url}">
              <p>${item.title}</p>
              <span>${new Date(item.date).toLocaleDateString('ko-KR')}</span>
           </div>`
      ).join('');
  };


  // --- Event Listeners ---

  recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = youtubeUrlInput.value.trim();
    if (!url) {
      displayError("YouTube URL을 입력해주세요.");
      return;
    }

    showLoading();

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      displayRecipes(data.recipes);
      
      const recipeTitle = data.recipes?.[0]?.title;
      saveToHistory(url, recipeTitle);

    } catch (error) {
      console.error('Fetch error:', error);
      displayError(`오류 발생: ${error.message}`);
    } finally {
      hideLoading();
    }
  });

  historyListEl.addEventListener('click', (e) => {
      const item = e.target.closest('.history-item');
      if (item) {
          youtubeUrlInput.value = item.dataset.url;
          recipeForm.dispatchEvent(new Event('submit'));
      }
  });

  // --- Initial Load ---
  loadHistory();

});
