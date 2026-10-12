const LOCAL_STORAGE_EXT_KEY = 'diff-tool-custom-extensions';
const SECTION_STORAGE_PREFIX = 'diff-tool-accordion-';

// Global references tracking dragging offsets execution maps
let activeDragPopupId = null;
let dragStartX = 0, dragStartY = 0;
let popupInitialLeft = 0, popupInitialTop = 0;

// Global tracking coordinates isolating long click event triggers 
let extensionPressTimer = null;
let activeEditingExtensionValue = null;

// Master configuration parameter model initialization layout lifecycle mapping
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('diff-tool-theme');
  const bodyNode = document.body;
  const toggleInput = document.getElementById('theme-toggle-checkbox');

  if (savedTheme === 'dark') {
    bodyNode.setAttribute('data-theme', 'dark');
    if (toggleInput) toggleInput.checked = true;
  } else {
    bodyNode.removeAttribute('data-theme');
    if (toggleInput) toggleInput.checked = false;
  }

  initializeAccordionSectionState('section-stats', 'arrow-stats');
  initializeAccordionSectionState('section-changes', 'arrow-changes');

  setupExtensionsWorkspaceContainer();

  window.addEventListener('scroll', () => {
    const btn = document.getElementById('header-scroll-btn');
    if (btn) btn.style.display = window.scrollY > 150 ? 'flex' : 'none';
  });

  document.addEventListener('mousemove', handleGlobalPopupMouseMoveEvent);
  document.addEventListener('mouseup', handleGlobalPopupMouseUpEvent);
});

// Theme Processing Controller Hook
function handleThemeToggleEvent(checkboxElement) {
  const bodyNode = document.body;
  if (checkboxElement.checked) {
    bodyNode.setAttribute('data-theme', 'dark');
    localStorage.setItem('diff-tool-theme', 'dark');
  } else {
    bodyNode.removeAttribute('data-theme');
    localStorage.setItem('diff-tool-theme', 'light');
  }
}

// Dynamic File Text Upload Core Sync Loops
function handleFileUpload(event, targetTextAreaId, labelId, defaultLabel) {
  const fileList = event.target.files;
  if (!fileList || fileList.length === 0) {
    document.getElementById(labelId).innerText = defaultLabel;
    return;
  }
  const file = fileList[0];
  document.getElementById(labelId).innerText = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById(targetTextAreaId).value = e.target.result;
  };
  reader.readAsText(file);
}

document.getElementById('file-orig').addEventListener('change', (e) =>
  handleFileUpload(e, 'text-orig', 'label-orig', 'Original Text (Left)')
);
document.getElementById('file-mod').addEventListener('change', (e) =>
  handleFileUpload(e, 'text-mod', 'label-mod', 'Modified Text (Right)')
);

document.getElementById('text-orig').addEventListener('input', () => {
  document.getElementById('label-orig').innerText = "Original Text (Left)";
});
document.getElementById('text-mod').addEventListener('input', () => {
  document.getElementById('label-mod').innerText = "Modified Text (Right)";
});

// Movable Popups Coordinate Drag-and-Drop Infrastructure Scripts
function initPopupDrag(event, popupId) {
  if (event.target.tagName.toLowerCase() === 'button') return;
  event.preventDefault();

  activeDragPopupId = popupId;
  const targetElement = document.getElementById(popupId);

  // Handle auto positioning metrics on startup bounds 
  if (!targetElement.style.left) {
    const currentComputedStyles = window.getComputedStyle(targetElement);
    targetElement.style.left = currentComputedStyles.left;
    targetElement.style.top = currentComputedStyles.top;
    targetElement.style.right = 'auto'; // Break binding
  }

  dragStartX = event.clientX;
  dragStartY = event.clientY;
  popupInitialLeft = parseInt(targetElement.style.left, 10) || 0;
  popupInitialTop = parseInt(targetElement.style.top, 10) || 0;
}

function handleGlobalPopupMouseMoveEvent(event) {
  if (!activeDragPopupId) return;
  event.preventDefault();

  const targetElement = document.getElementById(activeDragPopupId);
  const netDeltaX = event.clientX - dragStartX;
  const netDeltaY = event.clientY - dragStartY;

  targetElement.style.left = `${popupInitialLeft + netDeltaX}px`;
  targetElement.style.top = `${popupInitialTop + netDeltaY}px`;
}

function handleGlobalPopupMouseUpEvent() {
  activeDragPopupId = null;
}

// Modal Display Trigger Management Logic Elements
function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  modal.style.display = 'flex';
}

function closeMovablePopup(popupId) {
  document.getElementById(popupId).style.display = 'none';
  if (popupId === 'summary-popup') document.getElementById('toggle-summary-popup').checked = false;
  if (popupId === 'stats-popup') document.getElementById('toggle-stats-popup').checked = false;
}

function togglePopupCollapse(popupId) {
  document.getElementById(popupId).classList.toggle('minimized');
}

function updatePopupVisibilityState(popupId, isVisibleRequested) {
  const element = document.getElementById(popupId);
  element.style.display = isVisibleRequested ? 'flex' : 'none';
}

function switchSettingsPane(paneId, itemElementId) {
  document.querySelectorAll('.settings-pane-section').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));

  document.getElementById(paneId).classList.add('active');
  document.getElementById(itemElementId).classList.add('active');
}

function initializeAccordionSectionState(contentId, arrowId) {
  const contentBlock = document.getElementById(contentId);
  const arrowBlock = document.getElementById(arrowId);
  if (!contentBlock || !arrowBlock) return;

  const savedState = localStorage.getItem(SECTION_STORAGE_PREFIX + contentId);
  if (savedState === 'collapsed') {
    contentBlock.style.display = 'none';
    arrowBlock.classList.add('collapsed');
  } else {
    contentBlock.style.display = 'block';
    arrowBlock.classList.remove('collapsed');
  }
}

function toggleSection(contentId, arrowId) {
  const contentBlock = document.getElementById(contentId);
  const arrowBlock = document.getElementById(arrowId);

  if (contentBlock.style.display === 'none') {
    contentBlock.style.display = 'block';
    arrowBlock.classList.remove('collapsed');
    localStorage.setItem(SECTION_STORAGE_PREFIX + contentId, 'expanded');
  } else {
    contentBlock.style.display = 'none';
    arrowBlock.classList.add('collapsed');
    localStorage.setItem(SECTION_STORAGE_PREFIX + contentId, 'collapsed');
  }
}

// File Extensions Management Module with Inline Editing, Saving, and Deletion
const defaultBaseExtensions = [
  { value: '.txt', label: '.txt (Plain)' },
  { value: '.html', label: '.html (Web Markup)' },
  { value: '.xml', label: '.xml (Extensible)' },
  { value: '.svg', label: '.svg (Vector Art)' },
  { value: '.json', label: '.json (Data Objects)' }
];

function setupExtensionsWorkspaceContainer() {
  const container = document.getElementById('editable-extensions-box');
  if (!container) return;
  container.innerHTML = '';

  const savedData = localStorage.getItem(LOCAL_STORAGE_EXT_KEY);
  let customExtensions = [];
  try {
    if (savedData) customExtensions = JSON.parse(savedData);
  } catch (e) {
    console.error("Error reading saved extensions:", e);
  }

  // Output base locked defaults first
  defaultBaseExtensions.forEach(item => {
    const tag = document.createElement('div');
    tag.className = 'ext-editable-tag';
    tag.innerHTML = `<span>${item.label}</span> <span style="font-size:10px; color:var(--text-secondary); margin-left:4px;">🔒</span>`;
    container.appendChild(tag);
  });

  // Generate editable custom configurations from storage
  customExtensions.forEach(item => {
    const tag = document.createElement('div');
    tag.className = 'ext-editable-tag';
    tag.setAttribute('data-ext', item.value);

    tag.innerHTML = `
            <span>${item.label}</span>
            <span class="ext-action-link" title="Edit Extension" onclick="enterExtensionEditingMode('${item.value}', '${item.label}')">✏️</span>
            <span class="ext-action-link" title="Delete Extension" onclick="deleteCustomExtension('${item.value}')">❌</span>
        `;
    container.appendChild(tag);
  });

  // Combine arrays to sync operating system file dialog constraints
  const combinedList = [...defaultBaseExtensions, ...customExtensions];
  syncInputAcceptAttributes(combinedList);
}

function startExtensionPressTimer(event, value, label) {
  clearExtensionPressTimer();
  extensionPressTimer = setTimeout(() => {
    enterExtensionEditingMode(value, label);
  }, 3000); // Strict 3 second delay filter logic
}

function clearExtensionPressTimer() {
  if (extensionPressTimer) {
    clearTimeout(extensionPressTimer);
    extensionPressTimer = null;
  }
}

function enterExtensionEditingMode(value, fullLabel) {
  document.querySelectorAll('.ext-editable-tag').forEach(t => t.classList.remove('editing-now'));

  const activeChip = document.querySelector(`.ext-editable-tag[data-ext="${value}"]`);
  if (activeChip) activeChip.classList.add('editing-now');

  activeEditingExtensionValue = value;
  const inputField = document.getElementById('custom-ext-input');

  // Copy contents back to user input view pane
  inputField.value = fullLabel;
  inputField.focus();

  // Swap action buttons to edit mode state
  document.getElementById('ext-action-btn').innerText = 'Save';
  document.getElementById('ext-cancel-btn').style.display = 'inline-block';
}

function handleExtensionActionClick() {
  const inputField = document.getElementById('custom-ext-input');
  const rawInput = inputField.value.trim();
  if (!rawInput) return;

  // Regular expression clean up to match extension parameter syntax values
  const extMatch = rawInput.match(/^\.?[a-zA-Z0-9]+/);
  if (!extMatch) {
    alert("Invalid extension schema configuration rule (e.g. '.js Javascript')");
    return;
  }

  let cleanExt = extMatch[0].toLowerCase();
  if (!cleanExt.startsWith('.')) cleanExt = '.' + cleanExt;

  let description = rawInput.replace(extMatch[0], '').trim();
  const displayLabel = description ? `${cleanExt} ${description}` : cleanExt;

  const savedData = localStorage.getItem(LOCAL_STORAGE_EXT_KEY);
  let customList = [];
  try {
    if (savedData) customList = JSON.parse(savedData);
  } catch (e) { }

  if (activeEditingExtensionValue) {
    // Processing Save/Edit action routine
    customList = customList.filter(c => c.value !== activeEditingExtensionValue);
    customList.push({ value: cleanExt, label: displayLabel });
  } else {
    // Processing standard fresh Add routine
    if (defaultBaseExtensions.some(b => b.value === cleanExt) || customList.some(c => c.value === cleanExt)) {
      alert("This file extension profile already exists.");
      return;
    }
    customList.push({ value: cleanExt, label: displayLabel });
  }

  localStorage.setItem(LOCAL_STORAGE_EXT_KEY, JSON.stringify(customList));
  cancelExtensionEditingState();
  setupExtensionsWorkspaceContainer();
}

function deleteCustomExtension(value) {
  if (!confirm(`Are you sure you want to permanently remove the file filter for '${value}'?`)) return;

  const savedData = localStorage.getItem(LOCAL_STORAGE_EXT_KEY);
  let customList = [];
  try {
    if (savedData) customList = JSON.parse(savedData);
  } catch (e) { }

  // Filter out target value from tracking arrays
  customList = customList.filter(c => c.value !== value);
  localStorage.setItem(LOCAL_STORAGE_EXT_KEY, JSON.stringify(customList));

  // If the item currently being edited is deleted, reset the input form fields
  if (activeEditingExtensionValue === value) {
    cancelExtensionEditingState();
  }

  setupExtensionsWorkspaceContainer();
}

function cancelExtensionEditingState() {
  activeEditingExtensionValue = null;
  document.getElementById('custom-ext-input').value = '';
  document.querySelectorAll('.ext-editable-tag').forEach(t => t.classList.remove('editing-now'));

  document.getElementById('ext-action-btn').innerText = 'Add';
  document.getElementById('ext-cancel-btn').style.display = 'none';
}

function syncInputAcceptAttributes(combinedList) {
  const acceptString = combinedList.map(item => item.value).join(',');
  const leftInput = document.getElementById('file-orig');
  const rightInput = document.getElementById('file-mod');
  if (leftInput) leftInput.setAttribute('accept', acceptString);
  if (rightInput) rightInput.setAttribute('accept', acceptString);
}


function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Strict Longest Common Subsequence Character Match Core Diff Engine
function diffStrings(str1, str2, calculationMode) {
  let processStr1 = str1;
  let processStr2 = str2;

  if (calculationMode === 'ignore-whitespace') {
    processStr1 = str1.replace(/\s+/g, ' ').trim();
    processStr2 = str2.replace(/\s+/g, ' ').trim();
  } else if (calculationMode === 'case-insensitive') {
    processStr1 = str1.toLowerCase();
    processStr2 = str2.toLowerCase();
  }

  const m = processStr1.length, n = processStr2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (processStr1[i - 1] === processStr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m, j = n;
  let html1 = '', html2 = '';
  let delCount = 0, insCount = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && processStr1[i - 1] === processStr2[j - 1]) {
      const charOrig = escapeHtml(str1[i - 1] || '');
      const charMod = escapeHtml(str2[j - 1] || '');
      html1 = charOrig + html1;
      html2 = charMod + html2;
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      html2 = '<ins>' + escapeHtml(str2[j - 1]) + '</ins>' + html2;
      insCount++; j--;
    } else {
      html1 = '<del>' + escapeHtml(str1[i - 1]) + '</del>' + html1;
      delCount++; i--;
    }
  }
  return { left: html1, right: html2, delCount, insCount };
}

// Execution Core Logic Block Processing Form Matrix Mapping
function compareText() {
  const origText = document.getElementById('text-orig').value;
  const modText = document.getElementById('text-mod').value;

  const origLines = origText.split(/\r?\n/);
  const modLines = modText.split(/\r?\n/);
  const outputDiv = document.getElementById('diff-output');

  const calculationMode = document.getElementById('diff-level-select').value;

  let htmlResult = '';
  let i = 0, j = 0, rowCounter = 1;
  let totalGlobalChanges = 0, changeReports = [];

  while (i < origLines.length || j < modLines.length) {
    let rowClass = '', leftNum = '', rightNum = '', leftContent = '', rightContent = '';
    let compareLineOrig = origLines[i] || '';
    let compareLineMod = modLines[j] || '';

    if (calculationMode === 'ignore-whitespace') {
      compareLineOrig = compareLineOrig.replace(/\s+/g, ' ').trim();
      compareLineMod = compareLineMod.replace(/\s+/g, ' ').trim();
    } else if (calculationMode === 'case-insensitive') {
      compareLineOrig = compareLineOrig.toLowerCase();
      compareLineMod = compareLineMod.toLowerCase();
    }

    if (i < origLines.length && j < modLines.length) {
      if (compareLineOrig === compareLineMod) {
        rowClass = 'row-unchanged';
        leftNum = i + 1; rightNum = j + 1;
        leftContent = escapeHtml(origLines[i]);
        rightContent = escapeHtml(modLines[j]);
        i++; j++;
      } else {
        rowClass = 'row-modified';
        leftNum = i + 1; rightNum = j + 1;
        const charDiff = diffStrings(origLines[i], modLines[j], calculationMode);
        leftContent = charDiff.left; rightContent = charDiff.right;
        const lineChanges = charDiff.delCount + charDiff.insCount;
        totalGlobalChanges += lineChanges;
        changeReports.push({
          targetRowId: rowCounter,
          text: `Line ${leftNum}: ${lineChanges} changes (${charDiff.delCount} del, ${charDiff.insCount} ins)`
        });
        i++; j++;
      }
    } else if (i < origLines.length) {
      rowClass = 'row-deleted';
      leftNum = i + 1; leftContent = escapeHtml(origLines[i]);
      const lineChanges = origLines[i].length;
      totalGlobalChanges += lineChanges;
      changeReports.push({ targetRowId: rowCounter, text: `Line ${leftNum} (Left): Removed (${lineChanges} chars)` });
      i++;
    } else if (j < modLines.length) {
      rowClass = 'row-inserted';
      rightNum = j + 1; rightContent = escapeHtml(modLines[j]);
      const lineChanges = modLines[j].length;
      totalGlobalChanges += lineChanges;
      changeReports.push({ targetRowId: rowCounter, text: `Line ${rightNum} (Right): Added (${lineChanges} chars)` });
      j++;
    }

    htmlResult += `
            <div id="diff-row-${rowCounter}" class="diff-row ${rowClass}">
                <div class="diff-cell left"><span class="line-num">${leftNum}</span><span class="line-text">${leftContent}</span></div>
                <div class="diff-cell right"><span class="line-num">${rightNum}</span><span class="line-text">${rightContent}</span></div>
            </div>`;
    rowCounter++;
  }

  outputDiv.innerHTML = htmlResult;
  document.getElementById('output-container').style.display = 'block';
  document.getElementById('summary-total').innerText = `Total Character Changes: ${totalGlobalChanges}`;

  const totalInputChars = origText.length + modText.length;
  let similarityPercentage = 100;
  if (totalInputChars > 0) {
    similarityPercentage = Math.max(0, Math.min(100, (((totalInputChars - totalGlobalChanges) / totalInputChars) * 100))).toFixed(1);
  }

  const scoreBadge = document.getElementById('similarity-score');
  if (scoreBadge) {
    scoreBadge.innerText = `Similarity: ${similarityPercentage}%`;
    scoreBadge.style.display = 'inline-block';

    // Dynamic High-Contrast Traffic Light Coloring Algorithm
    const scoreNum = parseFloat(similarityPercentage);
    let bgColor = '';
    let textColor = '#ffffff'; // Default readable white text for dark backgrounds

    if (scoreNum === 100.0) {
      // Perfect pristine match for the selected tier
      bgColor = '#22863a'; // Vibrant Clean Green
    } else if (scoreNum >= 75.0) {
      // High similarity but with minor discrepancies
      bgColor = '#ffc107'; // Warn Yellow
      textColor = '#212529'; // High-contrast dark charcoal text for visibility
    } else if (scoreNum >= 40.0) {
      // Moderate changes detected
      bgColor = '#fd7e14'; // Warning Alert Orange
    } else {
      // Substantial differences or completely unique text contents
      bgColor = '#d73a49'; // Error Critical Red
    }

    // Inject dynamic style parameters directly into the element structure
    scoreBadge.style.backgroundColor = bgColor;
    scoreBadge.style.color = textColor;
    scoreBadge.style.borderColor = 'transparent';
  }

  document.getElementById('summary-list').innerHTML = changeReports.map(item => `
        <li style="margin-bottom: 6px;">
            <a href="javascript:void(0)" onclick="scrollToDiffRow(${item.targetRowId})" style="color: var(--btn-primary); text-decoration: none; font-weight: 500;">
                ${item.text}
            </a>
        </li>`).join('') || '<li>No structural changes found.</li>';

  if (document.getElementById('toggle-summary-popup').checked) {
    document.getElementById('summary-popup').classList.remove('minimized');
    document.getElementById('summary-popup').style.display = 'flex';
  }

  if (document.getElementById('toggle-stats-popup').checked) {
    document.getElementById('stats-popup').classList.remove('minimized');
    document.getElementById('stats-popup').style.display = 'flex';
    calculateAndRenderFileStats(origLines, modLines);
  }

  document.getElementById('output-container').scrollIntoView({ behavior: 'smooth' });
}

function scrollToDiffRow(rowId) {
  const targetRow = document.getElementById(`diff-row-${rowId}`);
  if (targetRow) {
    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetRow.style.outline = "2px solid var(--btn-primary)";
    targetRow.style.transition = "outline 0.2s ease";
    setTimeout(() => { targetRow.style.outline = "none"; }, 1200);
  }
}

function calculateAndRenderFileStats(origLines, modLines) {
  const rawLeftString = origLines.join('\n');
  const rawRightString = modLines.join('\n');

  const statsLeft = computeTextMetricsArray(origLines);
  renderStatCell('stats-chars-left', statsLeft.chars);
  renderStatCell('stats-words-left', statsLeft.words);
  renderStatCell('stats-lines-left', statsLeft.lines);
  renderInteractiveCell('stats-min-left', statsLeft.minWidth, statsLeft.minWidthLine, 'left');
  renderInteractiveCell('stats-max-left', statsLeft.maxWidth, statsLeft.maxWidthLine, 'left');

  const statsRight = computeTextMetricsArray(modLines);
  renderStatCell('stats-chars-right', statsRight.chars);
  renderStatCell('stats-words-right', statsRight.words);
  renderStatCell('stats-lines-right', statsRight.lines);
  renderInteractiveCell('stats-min-right', statsRight.minWidth, statsRight.minWidthLine, 'right');
  renderInteractiveCell('stats-max-right', statsRight.maxWidth, statsRight.maxWidthLine, 'right');

  generateFrequencyDistributionVisuals(rawLeftString, rawRightString);
}

function computeTextMetricsArray(linesArray) {
  let totalChars = 0, totalWords = 0;
  let minLineWidth = Infinity, maxWidth = -1;
  let minWidthLine = 1, maxWidthLine = 1;
  const actualLinesCount = linesArray.length;

  for (let k = 0; k < actualLinesCount; k++) {
    const standardLine = linesArray[k];
    const lineLen = standardLine.length;
    totalChars += lineLen;
    const cleanWords = standardLine.trim().split(/\s+/).filter(word => word.length > 0);
    totalWords += cleanWords.length;

    if (lineLen > maxWidth) {
      maxWidth = lineLen;
      maxWidthLine = k + 1;
    }
    if (lineLen < minLineWidth && lineLen > 0) {
      minLineWidth = lineLen;
      minWidthLine = k + 1;
    }
  }
  if (minLineWidth === Infinity) { minLineWidth = 0; minWidthLine = 1; }
  if (maxWidth === -1) maxWidth = 0;

  return {
    chars: totalChars, words: totalWords, lines: actualLinesCount,
    minWidth: minLineWidth, minWidthLine: minWidthLine,
    maxWidth: maxWidth, maxWidthLine: maxWidthLine
  };
}

function renderStatCell(elementId, value) {
  document.getElementById(elementId).innerText = value;
}

function renderInteractiveCell(elementId, width, lineNumber, panelSide) {
  const cellElement = document.getElementById(elementId);
  if (width === 0 && elementId.includes('min')) {
    cellElement.innerText = "0";
    return;
  }
  cellElement.innerHTML = `
        <a href="javascript:void(0)" onclick="scrollToMetricLine(${lineNumber}, '${panelSide}')" title="Jump to Line ${lineNumber}">
            ${width} <span style="font-size: 10px; font-weight: normal; color: var(--text-secondary);">(Ln ${lineNumber})</span>
        </a>`;
}

function scrollToMetricLine(lineNumber, panelSide) {
  const rows = document.querySelectorAll('.diff-row');
  let targetRow = null;
  for (let row of rows) {
    const cellSelector = panelSide === 'left' ? '.left .line-num' : '.right .line-num';
    const numSpan = row.querySelector(cellSelector);
    if (numSpan && parseInt(numSpan.innerText, 10) === lineNumber) {
      targetRow = row;
      break;
    }
  }
  if (targetRow) {
    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const leftCell = targetRow.querySelector('.left');
    const rightCell = targetRow.querySelector('.right');
    if (leftCell) leftCell.classList.add('flash-highlight-active');
    if (rightCell) rightCell.classList.add('flash-highlight-active');
    setTimeout(() => {
      if (leftCell) leftCell.classList.remove('flash-highlight-active');
      if (rightCell) rightCell.classList.remove('flash-highlight-active');
    }, 1500);
  }
}

function generateFrequencyDistributionVisuals(leftText, rightText) {
  const chartWrapper = document.getElementById('distribution-chart-wrapper');
  const barsContainer = document.getElementById('chart-bars-container');
  if (!leftText && !rightText) { chartWrapper.style.display = 'none'; return; }

  const freqLeft = countCharactersDensityMap(leftText);
  const freqRight = countCharactersDensityMap(rightText);
  const combinedKeys = Array.from(new Set([...Object.keys(freqLeft), ...Object.keys(freqRight)]))
    .filter(char => char !== ' ' && char !== '\n' && char !== '\r' && char !== '\t')
    .map(char => ({ char, total: (freqLeft[char] || 0) + (freqRight[char] || 0), leftCount: freqLeft[char] || 0, rightCount: freqRight[char] || 0 }));

  combinedKeys.sort((a, b) => b.total - a.total);
  const topSlices = combinedKeys.slice(0, 5);
  if (topSlices.length === 0) { chartWrapper.style.display = 'none'; return; }

  const maxPeakValue = Math.max(...topSlices.map(item => Math.max(item.leftCount, item.rightCount)));
  let inlineChartHtml = '';
  topSlices.forEach(item => {
    const pctLeft = maxPeakValue > 0 ? ((item.leftCount / maxPeakValue) * 100) : 0;
    const pctRight = maxPeakValue > 0 ? ((item.rightCount / maxPeakValue) * 100) : 0;
    let displaySymbol = item.char;
    if (displaySymbol === '&') displaySymbol = '&amp;';
    if (displaySymbol === '<') displaySymbol = '&lt;';
    if (displaySymbol === '>') displaySymbol = '&gt;';

    inlineChartHtml += `
            <div class="chart-row-item">
                <span class="chart-label-char">${displaySymbol}</span>
                <div class="chart-bars-split-track">
                    <div style="display:flex; align-items:center; width:100%;"><div class="chart-fill-bar left-file" style="width: ${pctLeft}%;"></div><span class="chart-count-lbl">${item.leftCount}</span></div>
                    <div style="display:flex; align-items:center; width:100%;"><div class="chart-fill-bar right-file" style="width: ${pctRight}%;"></div><span class="chart-count-lbl">${item.rightCount}</span></div>
                </div>
            </div>`;
  });
  barsContainer.innerHTML = inlineChartHtml;
  chartWrapper.style.display = 'block';
}

function countCharactersDensityMap(targetString) {
  const freqMap = {};
  for (let char of targetString) { freqMap[char] = (freqMap[char] || 0) + 1; }
  return freqMap;
}

function resetForm() {
  document.getElementById('text-orig').value = '';
  document.getElementById('text-mod').value = '';
  document.getElementById('file-orig').value = '';
  document.getElementById('file-mod').value = '';
  document.getElementById('label-orig').innerText = "Original Text (Left)";
  document.getElementById('label-mod').innerText = "Modified Text (Right)";
  document.getElementById('output-container').style.display = 'none';
  document.getElementById('summary-popup').style.display = 'none';
  document.getElementById('stats-popup').style.display = 'none';
  document.getElementById('similarity-score').style.display = 'none';
}
