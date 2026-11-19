// Main application logic for GTA VI Trophy Guide & Tracker
// DOM Elements
const trophyList = document.getElementById('trophy-list');
const trophyDetail = document.getElementById('trophy-detail');
const progressText = document.getElementById('progress-text');
const spoilerToggle = document.getElementById('spoiler-toggle');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');
const resetBtn = document.getElementById('reset-btn');
const checklistTab = document.getElementById('checklist-tab');
const roadmapTab = document.getElementById('roadmap-tab');
const filterPills = document.querySelectorAll('.filter-pill');

// State management
let trophies = [];
let earnedTrophies = new Set();
let currentView = 'checklist';
let currentFilter = 'all';
let currentSpoilerMode = false;
let currentSelectedTrophy = null;

// Initialize the application
async function init() {
    // Load data
    await loadTrophies();
    
    // Load saved progress
    loadProgress();
    
    // Setup event listeners
    setupEventListeners();
    
    // Parse URL hash and apply state
    parseUrlHash();
    
    // Render initial view
    render();
    
    // Update progress display
    updateProgress();
}

// Load trophies from JSON file
async function loadTrophies() {
    try {
        const response = await fetch('data/trophies.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            // If data is directly an array
            trophies = data;
        } else if (data.trophies && Array.isArray(data.trophies)) {
            // If data is an object with a trophies property
            trophies = data.trophies;
        } else {
            throw new Error('Invalid trophies format');
        }
    } catch (error) {
        console.error('Failed to load trophies:', error);
        // Create fallback data
        trophies = Array.from({length: 55}, (_, i) => ({
            id: i + 1,
            name: `Trophy ${i + 1}`,
            description: `Description for trophy ${i + 1}`,
            grade: 'bronze',
            kind: 'story',
            missable: false,
            stage: Math.floor(i / 10) + 1,
            roadmapNote: '',
            guide: 'Guide for this trophy.',
            sources: []
        }));
    }
}

// Load saved progress from localStorage
function loadProgress() {
    const saved = localStorage.getItem('gta6-tracker-v1');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            earnedTrophies = new Set(data.earned || []);
            currentSpoilerMode = data.spoilers === true;
            spoilerToggle.checked = currentSpoilerMode;
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }
}

// Save progress to localStorage
function saveProgress() {
    const data = {
        earned: Array.from(earnedTrophies),
        spoilers: currentSpoilerMode
    };
    localStorage.setItem('gta6-tracker-v1', JSON.stringify(data));
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    checklistTab.addEventListener('click', () => switchView('checklist'));
    roadmapTab.addEventListener('click', () => switchView('roadmap'));
    
    // Spoiler toggle
    spoilerToggle.addEventListener('change', toggleSpoilerMode);
    
    // Export button
    exportBtn.addEventListener('click', exportProgress);
    
    // Import button
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', importProgress);
    
    // Reset button
    resetBtn.addEventListener('click', resetProgress);
    
    // Filter pills
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            setActiveFilter(pill.dataset.filter);
        });
    });
    
    // URL hash change
    window.addEventListener('hashchange', parseUrlHash);
}

// Switch between checklist and roadmap views
function switchView(view) {
    currentView = view;
    updateUrlHash();
    render();
}

// Toggle spoiler mode
function toggleSpoilerMode() {
    currentSpoilerMode = spoilerToggle.checked;
    saveProgress();
    updateUrlHash();
    render();
}

// Set active filter
function setActiveFilter(filter) {
    currentFilter = filter;
    filterPills.forEach(pill => {
        if (pill.dataset.filter === filter) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
    updateUrlHash();
    render();
}

// Export progress to JSON file
function exportProgress() {
    const data = {
        earned: Array.from(earnedTrophies),
        spoilers: currentSpoilerMode
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gta6-progress.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import progress from JSON file
function importProgress(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data.earned)) {
                earnedTrophies = new Set(data.earned);
                currentSpoilerMode = data.spoilers === true;
                spoilerToggle.checked = currentSpoilerMode;
                saveProgress();
                updateProgress();
                render();
                updateUrlHash();
            }
        } catch (error) {
            console.error('Failed to import progress:', error);
            alert('Failed to import progress. Please check the file format.');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    importInput.value = '';
}

// Reset all progress
function resetProgress() {
    if (confirm('Are you sure you want to reset all progress?')) {
        earnedTrophies.clear();
        saveProgress();
        updateProgress();
        render();
    }
}

// Parse URL hash and apply state
function parseUrlHash() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const view = params.get('view') || 'checklist';
    const filter = params.get('filter') || 'all';
    const spoilers = params.get('spoilers') === 'on';
    
    if (view !== currentView) {
        switchView(view);
    }
    
    if (filter !== currentFilter) {
        setActiveFilter(filter);
    }
    
    if (spoilers !== currentSpoilerMode) {
        spoilerToggle.checked = spoilers;
        toggleSpoilerMode();
    }
}

// Update URL hash with current state
function updateUrlHash() {
    const params = new URLSearchParams();
    params.set('view', currentView);
    params.set('filter', currentFilter);
    params.set('spoilers', currentSpoilerMode ? 'on' : 'off');
    
    window.location.hash = `#${params.toString()}`;
}

// Render the appropriate view
function render() {
    if (currentView === 'checklist') {
        renderChecklist();
    } else {
        renderRoadmap();
    }
}

// Render checklist view
function renderChecklist() {
    // Clear existing content
    trophyList.innerHTML = '';
    
    // Filter trophies
    const filteredTrophies = filterTrophies(trophies);
    
    // Render each trophy
    filteredTrophies.forEach(trophy => {
        const trophyRow = createTrophyRow(trophy);
        trophyList.appendChild(trophyRow);
    });
    
    // Show empty state if no trophies
    if (filteredTrophies.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No trophies match the current filter.';
        trophyList.appendChild(emptyState);
    }
}

// Render roadmap view
function renderRoadmap() {
    // Clear existing content
    const roadmapContainer = document.querySelector('.roadmap-container');
    if (roadmapContainer) {
        roadmapContainer.innerHTML = '';
        
        // Group trophies by stage
        const stageGroups = {};
        trophies.forEach(trophy => {
            const stage = trophy.stage || 1;
            if (!stageGroups[stage]) {
                stageGroups[stage] = [];
            }
            stageGroups[stage].push(trophy);
        });
        
        // Render stages
        for (let stage = 1; stage <= 6; stage++) {
            if (stageGroups[stage]) {
                const stageElement = document.createElement('div');
                stageElement.className = 'roadmap-stage';
                stageElement.dataset.stage = stage;
                
                const stageTitle = document.createElement('h3');
                stageTitle.textContent = `Stage ${stage}: ${getStageName(stage)}`;
                
                const stageDesc = document.createElement('p');
                stageDesc.textContent = getStageDescription(stage);
                
                stageElement.appendChild(stageTitle);
                stageElement.appendChild(stageDesc);
                
                // Add trophy indicators
                const trophyList = document.createElement('ul');
                trophyList.className = 'roadmap-trophy-list';
                
                stageGroups[stage].forEach(trophy => {
                    const trophyItem = document.createElement('li');
                    trophyItem.className = 'roadmap-trophy-item';
                    
                    const trophyName = document.createElement('span');
                    trophyName.textContent = trophy.name;
                    trophyName.className = 'roadmap-trophy-name';
                    
                    const trophyStatus = document.createElement('span');
                    trophyStatus.className = 'roadmap-trophy-status';
                    trophyStatus.textContent = earnedTrophies.has(trophy.id) ? '✓' : '○';
                    
                    trophyItem.appendChild(trophyName);
                    trophyItem.appendChild(trophyStatus);
                    trophyList.appendChild(trophyItem);
                });
                
                stageElement.appendChild(trophyList);
                roadmapContainer.appendChild(stageElement);
            }
        }
    }
}

// Get stage name
function getStageName(stage) {
    const names = [
        '',
        'Early Story',
        'Criminal Expansion',
        'Mid-Game Activities',
        'Advanced Missions',
        'Side Quests & Collection',
        'Final Completion'
    ];
    return names[stage] || `Stage ${stage}`;
}

// Get stage description
function getStageDescription(stage) {
    const descriptions = [
        '',
        'Complete initial missions and basic story chapters',
        'Engage in heists and deeper story elements',
        'Complete major story chapters and activities',
        'Handle complex storylines and advanced activities',
        'Complete side missions and collectibles',
        'Complete all storylines and achieve platinum'
    ];
    return descriptions[stage] || `Stage ${stage} description`;
}

// Filter trophies based on current filter
function filterTrophies(trophiesToFilter) {
    return trophiesToFilter.filter(trophy => {
        // Apply filter
        switch (currentFilter) {
            case 'story':
                return trophy.kind === 'story';
            case 'collectible':
                return trophy.kind === 'collectible';
            case 'activity':
                return trophy.kind === 'activity';
            case 'online':
                return trophy.kind === 'online';
            case 'missable':
                return trophy.missable;
            case 'unearned':
                return !earnedTrophies.has(trophy.id);
            default:
                return true;
        }
    });
}

// Create a trophy row element
function createTrophyRow(trophy) {
    const li = document.createElement('li');
    li.className = 'trophy-item';
    li.dataset.trophyId = trophy.id;
    
    // Add earned class if applicable
    if (earnedTrophies.has(trophy.id)) {
        li.classList.add('earned');
    }
    
    // Add missable class if applicable
    if (trophy.missable) {
        li.classList.add('missable');
    }
    
    // Add spoiler class if in spoiler mode and unearned
    if (currentSpoilerMode && !earnedTrophies.has(trophy.id) && trophy.kind === 'story') {
        li.classList.add('spoiler-hidden');
    }
    
    // Create header
    const header = document.createElement('div');
    header.className = 'trophy-header';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'trophy-name';
    nameSpan.textContent = trophy.name;
    
    const gradeBadge = document.createElement('span');
    gradeBadge.className = `trophy-grade grade-${trophy.grade}`;
    gradeBadge.textContent = trophy.grade.charAt(0).toUpperCase() + trophy.grade.slice(1);
    
    header.appendChild(nameSpan);
    header.appendChild(gradeBadge);
    
    // Create description
    const descP = document.createElement('p');
    descP.className = 'trophy-description';
    if (currentSpoilerMode && !earnedTrophies.has(trophy.id) && trophy.kind === 'story') {
        descP.textContent = '???';
    } else {
        descP.textContent = trophy.description;
    }
    
    // Create guide preview
    const guideP = document.createElement('p');
    guideP.className = 'trophy-guide';
    guideP.textContent = trophy.guide.substring(0, 100) + (trophy.guide.length > 100 ? '...' : '');
    
    // Create tags
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'trophy-tags';
    
    const kindTag = document.createElement('span');
    kindTag.className = 'trophy-kind';
    kindTag.textContent = trophy.kind;
    
    const missableTag = document.createElement('span');
    missableTag.className = 'trophy-missable';
    missableTag.textContent = trophy.missable ? 'Missable' : '';
    
    const stageTag = document.createElement('span');
    stageTag.className = 'trophy-stage';
    stageTag.textContent = `Stage ${trophy.stage}`;
    
    tagsDiv.appendChild(kindTag);
    tagsDiv.appendChild(missableTag);
    tagsDiv.appendChild(stageTag);
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'trophy-checkbox';
    checkbox.dataset.trophyId = trophy.id;
    checkbox.checked = earnedTrophies.has(trophy.id);
    
    // Add event listener to checkbox
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            earnedTrophies.add(trophy.id);
        } else {
            earnedTrophies.delete(trophy.id);
        }
        saveProgress();
        updateProgress();
        render();
        updateUrlHash();
    });
    
    // Add click handler for detail view
    li.addEventListener('click', () => {
        showTrophyDetail(trophy);
    });
    
    // Assemble the row
    li.appendChild(header);
    li.appendChild(descP);
    li.appendChild(guideP);
    li.appendChild(tagsDiv);
    li.appendChild(checkbox);
    
    return li;
}

// Show trophy detail panel
function showTrophyDetail(trophy) {
    currentSelectedTrophy = trophy;
    
    // Clear existing content
    trophyDetail.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'trophy-header';
    
    const nameH2 = document.createElement('h2');
    nameH2.className = 'trophy-name';
    nameH2.textContent = trophy.name;
    
    const gradeBadge = document.createElement('span');
    gradeBadge.className = `trophy-grade grade-${trophy.grade}`;
    gradeBadge.textContent = trophy.grade.charAt(0).toUpperCase() + trophy.grade.slice(1);
    
    header.appendChild(nameH2);
    header.appendChild(gradeBadge);
    
    // Create description
    const descP = document.createElement('p');
    descP.className = 'trophy-description';
    descP.textContent = trophy.description;
    
    // Create grade
    const gradeP = document.createElement('p');
    gradeP.className = 'trophy-grade';
    gradeP.textContent = `Grade: ${trophy.grade.charAt(0).toUpperCase() + trophy.grade.slice(1)}`;
    
    // Create guide
    const guideH3 = document.createElement('h3');
    guideH3.textContent = 'Guide';
    
    const guideP = document.createElement('p');
    guideP.className = 'trophy-guide';
    guideP.textContent = trophy.guide;
    
    // Create roadmap info
    const roadmapH3 = document.createElement('h3');
    roadmapH3.textContent = 'Roadmap Stage';
    
    const roadmapP = document.createElement('p');
    roadmapP.className = 'trophy-roadmap';
    roadmapP.textContent = `Stage ${trophy.stage}: ${getStageName(trophy.stage)}`;
    
    // Create sources
    const sourcesH3 = document.createElement('h3');
    sourcesH3.textContent = 'Sources';
    
    const sourcesDiv = document.createElement('div');
    sourcesDiv.className = 'trophy-sources';
    
    if (trophy.sources && trophy.sources.length > 0) {
        trophy.sources.forEach(source => {
            const sourceLink = document.createElement('a');
            sourceLink.href = source.url;
            sourceLink.target = '_blank';
            sourceLink.rel = 'noopener';
            sourceLink.className = 'source-link';
            sourceLink.textContent = source.label;
            sourcesDiv.appendChild(sourceLink);
        });
    } else {
        const noSources = document.createElement('p');
        noSources.textContent = 'No sources available for this trophy.';
        sourcesDiv.appendChild(noSources);
    }
    
    // Create checkbox for earned status
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'trophy-checkbox-container';
    
    const checkboxLabel = document.createElement('label');
    checkboxLabel.textContent = 'Mark as earned';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'detail-trophy-checkbox';
    checkbox.dataset.trophyId = trophy.id;
    checkbox.checked = earnedTrophies.has(trophy.id);
    
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            earnedTrophies.add(trophy.id);
        } else {
            earnedTrophies.delete(trophy.id);
        }
        saveProgress();
        updateProgress();
        render();
        updateUrlHash();
    });
    
    checkboxLabel.appendChild(checkbox);
    checkboxContainer.appendChild(checkboxLabel);
    
    // Assemble detail panel
    trophyDetail.appendChild(header);
    trophyDetail.appendChild(descP);
    trophyDetail.appendChild(gradeP);
    trophyDetail.appendChild(guideH3);
    trophyDetail.appendChild(guideP);
    trophyDetail.appendChild(roadmapH3);
    trophyDetail.appendChild(roadmapP);
    trophyDetail.appendChild(sourcesH3);
    trophyDetail.appendChild(sourcesDiv);
    trophyDetail.appendChild(checkboxContainer);
}

// Update progress display
function updateProgress() {
    const earnedCount = earnedTrophies.size;
    progressText.textContent = `Progress: ${earnedCount}/55 earned`;
    
    // Update progress bar
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        const percentage = (earnedCount / 55) * 100;
        progressBar.style.width = `${percentage}%`;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);