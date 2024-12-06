document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const suggestionBox = document.getElementById('suggestionBox');
    const notificationDiv = document.getElementById('notification');
    const loadingDiv = document.getElementById('loading');
    const pokemonInput = document.getElementById('pokemonInput');
    const pokemonDataDiv = document.getElementById('pokemonData');
    const moreInfoButton = document.getElementById('moreInfoButton');
    const advancedPanel = document.getElementById('advancedPanel');
    const featureOutput = document.getElementById('featureOutput');

    let pokemonNames = [];
    let currentPokemonData = null;

    // Pre-fetch Pokémon names for suggestions
    fetch('https://pokeapi.co/api/v2/pokemon?limit=1000')
        .then(res => res.json())
        .then(data => {
            pokemonNames = data.results.map(p => p.name);
        })
        .catch(() => {
            showNotification('Could not load Pokémon list for suggestions.', true);
        });

    // Search button event
    searchButton.addEventListener('click', fetchPokemon);

    // Trigger search on Enter key
    pokemonInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            fetchPokemon();
        }
    });

    // Input event for suggestions
    pokemonInput.addEventListener('input', () => {
        const inputVal = pokemonInput.value.toLowerCase().trim();
        if (!inputVal) {
            suggestionBox.innerHTML = '';
            suggestionBox.classList.add('hidden');
            return;
        }

        const suggestions = pokemonNames
            .filter(name => name.startsWith(inputVal))
            .slice(0, 10);

        if (suggestions.length > 0) {
            suggestionBox.innerHTML = suggestions
                .map(name => `<div class="suggestion">${name}</div>`)
                .join('');
            suggestionBox.classList.remove('hidden');
        } else {
            suggestionBox.innerHTML = '';
            suggestionBox.classList.add('hidden');
        }
    });

    // Click on suggestion
    suggestionBox.addEventListener('click', (e) => {
        if (!e.target.classList.contains('suggestion')) return;
        pokemonInput.value = e.target.textContent;
        suggestionBox.innerHTML = '';
        suggestionBox.classList.add('hidden');
        fetchPokemon();
    });

    async function fetchPokemon() {
        clearNotification();
        const pokemonName = pokemonInput.value.toLowerCase().trim();
        if (!pokemonName) {
            showNotification('Please enter a Pokémon name or ID.', true);
            return;
        }

        loadingDiv.classList.remove('hidden');
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
            if (!response.ok) {
                throw new Error('Pokémon not found');
            }
            const data = await response.json();
            currentPokemonData = data;
            displayPokemon(data);

            // Automatically open More Info and show Pokedex entry for the new Pokemon
            moreInfoButton.classList.remove('hidden');
            advancedPanel.classList.remove('hidden');
            await handleFeature('pokedex');
        } catch (error) {
            showNotification(error.message, true);
        } finally {
            loadingDiv.classList.add('hidden');
        }
    }

    function displayPokemon(pokemon) {
        pokemonDataDiv.innerHTML = `
            <img src="${pokemon.sprites.other['official-artwork'].front_default}" alt="${pokemon.name}">
            <h2>${pokemon.name}</h2>
            <div class="types">
                <strong>Type(s):</strong> ${pokemon.types.map(t => `<span>${t.type.name}</span>`).join('')}
            </div>
            <div class="abilities">
                <strong>Abilities:</strong> ${pokemon.abilities.map(a => `<span>${a.ability.name}</span>`).join('')}
            </div>
            <div class="stats">
                <strong>Stats:</strong>
                ${pokemon.stats.map(s => `<div>${s.stat.name}: ${s.base_stat}</div>`).join('')}
            </div>
        `;
    }

    function showNotification(message, isError = false) {
        notificationDiv.textContent = message;
        notificationDiv.style.backgroundColor = isError ? '#ffcccc' : '#ccffcc';
        notificationDiv.style.color = isError ? '#660000' : '#006600';
        notificationDiv.classList.remove('hidden');
    }

    function clearNotification() {
        notificationDiv.textContent = '';
        notificationDiv.classList.add('hidden');
    }

    // More Info toggle
    moreInfoButton.addEventListener('click', () => {
        advancedPanel.classList.toggle('hidden');
    });

    // Close advanced panel
    advancedPanel.querySelector('.close-button').addEventListener('click', () => {
        advancedPanel.classList.add('hidden');
    });

    // Handle feature buttons
    advancedPanel.addEventListener('click', async (e) => {
        if (!e.target.classList.contains('feature-button')) return;
        const feature = e.target.getAttribute('data-feature');
        await handleFeature(feature);
    });

    async function handleFeature(feature) {
        if (!currentPokemonData) return;
        featureOutput.innerHTML = 'Loading...';
        featureOutput.classList.remove('hidden');

        if (feature === 'pokedex') {
            const speciesData = await fetchSpeciesData(currentPokemonData.name);
            if (speciesData) {
                const flavorText = getEnglishFlavorText(speciesData.flavor_text_entries);
                featureOutput.innerHTML = `<h3>Pokédex Entry</h3><p>${flavorText}</p>`;
            } else {
                featureOutput.innerHTML = `<p>Could not load Pokédex entry.</p>`;
            }
        } else if (feature === 'evolution') {
            const chainData = await fetchEvolutionChainData(currentPokemonData.name);
            if (chainData) {
                const chainHTML = await generateEvolutionChainHTML(chainData);
                featureOutput.innerHTML = `<h3>Evolution Chain</h3>${chainHTML}`;
            } else {
                featureOutput.innerHTML = `<p>Could not load Evolution Chain.</p>`;
            }
        } else if (feature === 'compare') {
            featureOutput.innerHTML = generateCompareUI();
            const compareInput = document.getElementById('compareInput');
            const compareButton = document.getElementById('compareButton');
            
            compareButton.addEventListener('click', () => doCompare(compareInput.value));
            compareInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') doCompare(compareInput.value);
            });
        } else if (feature === 'forms') {
            const speciesData = await fetchSpeciesData(currentPokemonData.name);
            if (!speciesData) {
                featureOutput.innerHTML = `<p>Could not load forms data.</p>`;
                return;
            }
            const formsHTML = await generateFormsHTML(speciesData);
            featureOutput.innerHTML = `<h3>Alternate Forms</h3>${formsHTML}`;
        }
    }

    async function fetchSpeciesData(name) {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${name}`);
        return response.ok ? response.json() : null;
    }

    async function fetchEvolutionChainData(name) {
        const speciesData = await fetchSpeciesData(name);
        if (!speciesData) return null;
        const chainUrl = speciesData.evolution_chain.url;
        const chainRes = await fetch(chainUrl);
        return chainRes.ok ? chainRes.json() : null;
    }

    function getEnglishFlavorText(entries) {
        const entry = entries.find(e => e.language.name === 'en');
        return entry ? entry.flavor_text.replace(/\s+/g, ' ') : 'No English flavor text found.';
    }

    // Fetch images and display evolution chain
    async function generateEvolutionChainHTML(chainData) {
        let chainArray = [];
        let current = chainData.chain;
        while (current) {
            chainArray.push(current.species.name);
            current = current.evolves_to[0];
        }

        // Fetch images for each species
        const chainPromises = chainArray.map(async (name) => {
            const pokeData = await fetchPokemonData(name);
            return `<div class="evolution-chain-segment">
                <img src="${pokeData.sprites.other['official-artwork'].front_default}" alt="${name}">
                <span>${name}</span>
            </div>`;
        });

        const segments = await Promise.all(chainPromises);
        return `<div class="evolution-chain">
            ${segments.join('<span class="evolution-arrow">→</span>')}
        </div>`;
    }

    async function fetchPokemonData(name) {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        return response.ok ? response.json() : null;
    }

    function generateCompareUI() {
        return `
            <h3>Compare Pokémon</h3>
            <div class="compare-search">
                <input type="text" id="compareInput" placeholder="Enter another Pokémon">
                <button id="compareButton" class="pokeball-button" title="Compare"></button>
            </div>
            <div id="compareResults" class="compare-container">
                <!-- Left: Current Pokémon -->
                <div id="compareLeft" class="compare-column"></div>
                <!-- Right: Other Pokémon -->
                <div id="compareRight" class="compare-column"></div>
            </div>
        `;
    }

    async function doCompare(name) {
        name = name.trim().toLowerCase();
        const compareResults = document.getElementById('compareResults');
        const leftCol = document.getElementById('compareLeft');
        const rightCol = document.getElementById('compareRight');

        if (!name) {
            rightCol.innerHTML = '<p>Please enter a Pokémon name or ID.</p>';
            return;
        }

        const data = await fetchPokemonData(name);
        if (!data) {
            rightCol.innerHTML = `<p>Could not find ${name}.</p>`;
            return;
        }

        // Display current Pokemon on left
        leftCol.innerHTML = generatePokemonDetailsHTML(currentPokemonData);
        // Display compared Pokemon on right
        rightCol.innerHTML = generatePokemonDetailsHTML(data);
    }

    function generatePokemonDetailsHTML(pokemon) {
        return `
            <img src="${pokemon.sprites.other['official-artwork'].front_default}" alt="${pokemon.name}">
            <h3>${pokemon.name}</h3>
            <div><strong>Type(s):</strong> ${pokemon.types.map(t => `<span>${t.type.name}</span>`).join(' ')}</div>
            <div><strong>Abilities:</strong> ${pokemon.abilities.map(a => `<span>${a.ability.name}</span>`).join(' ')}</div>
            <div><strong>Stats:</strong>
                ${pokemon.stats.map(s => `<div>${s.stat.name}: ${s.base_stat}</div>`).join('')}
            </div>
        `;
    }

    async function generateFormsHTML(speciesData) {
        // speciesData.varieties contains forms/varieties
        const varieties = speciesData.varieties;
        if (!varieties || varieties.length <= 1) {
            return `<p>No alternate forms found.</p>`;
        }

        const formsPromises = varieties.map(async (variety) => {
            // Fetch data for each variety
            const varietyData = await fetchPokemonData(variety.pokemon.name);
            if (!varietyData) return '';
            return `
                <div class="form-item">
                    <img src="${varietyData.sprites.other['official-artwork'].front_default}" alt="${variety.pokemon.name}">
                    <p>${variety.pokemon.name}</p>
                </div>
            `;
        });

        const formsHTML = (await Promise.all(formsPromises)).join('');
        return `<div class="forms-grid">${formsHTML}</div>`;
    }
});