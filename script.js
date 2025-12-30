async function loadAllData() {
    try {
        // Fetch from GitHub Gist (use raw URL without revision hash to always get latest)
        const response = await fetch('https://gist.githubusercontent.com/xender1/39473d84ba1e6982726a72bd5d90fe9e/raw/gistfile1.txt');
        if (!response.ok) throw new Error('Failed to load stats.json');
        const data = await response.json();

        const uniqueMatches = data.uniqueMatches;
        const squadWins = data.squadWins;
        const bestStack = data.bestStack;
        const allStacks = data.allStacks || [];
        const allPlayerData = data.playerStats;

        // Transform data to match expected format
        const formattedData = allPlayerData.map(player => ({
            name: player.name,
            tag: player.tag,
            cardId: player.cardId,
            rank: player.rank,
            rankTier: player.rankTier,
            stats: {
                matchCount: player.matchCount,
                totalKills: player.totalKills,
                totalDeaths: player.totalDeaths,
                totalAssists: player.totalAssists,
                totalHeadshots: player.totalHeadshots,
                wins: player.wins,
                headshotPercent: player.headshotPercent,
                kd: player.kd,
                winRate: player.winRate,
                topAgent: player.topAgent,
                sortedMaps: player.sortedMaps,
                aces: player.aces,
                firstBloods: player.firstBloods,
                knifeKills: player.knifeKills,
                knifeDeaths: player.knifeDeaths,
                mostPlayedStack: player.mostPlayedStack,
                bestMatch: player.bestMatch ? {
                    player: {
                        stats: {
                            kills: player.bestMatch.kills,
                            deaths: player.bestMatch.deaths
                        },
                        agent: { name: player.bestMatch.agent }
                    },
                    match: {
                        metadata: {
                            map: { name: player.bestMatch.map }
                        }
                    }
                } : null
            }
        }));

        renderPage(formattedData, uniqueMatches, squadWins, bestStack, allStacks);
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('content').innerHTML =
            '<div class="loading">Error loading stats. Run generate_stats.py first.</div>';
    }
}

function renderPage(allPlayerData, uniqueMatches, squadWins, bestStack, allStacks) {
    // Calculate squad totals
    const squadStats = {
        totalMatches: uniqueMatches,
        totalKills: 0,
        totalDeaths: 0,
        totalAssists: 0,
        totalHeadshots: 0
    };

    allPlayerData.forEach(p => {
        squadStats.totalKills += p.stats.totalKills;
        squadStats.totalDeaths += p.stats.totalDeaths;
        squadStats.totalAssists += p.stats.totalAssists;
        squadStats.totalHeadshots += p.stats.totalHeadshots;
    });

    const squadKD = squadStats.totalDeaths > 0
        ? (squadStats.totalKills / squadStats.totalDeaths).toFixed(2)
        : squadStats.totalKills;
    const squadWinRate = squadStats.totalMatches > 0
        ? ((squadWins / squadStats.totalMatches) * 100).toFixed(0)
        : 0;

    // Find Best K/D
    const bestKD = allPlayerData.reduce((best, p) =>
        parseFloat(p.stats.kd) > parseFloat(best?.stats.kd || 0) ? p : best, null);

    let content = `
        <div class="squad-section">
            <h2>Squad Stats</h2>
            <p class="subtitle">Squad Data Only - 5 Stacks</p>
            <div class="highlights">
                <div class="highlight-card">
                    <div class="highlight-value">${allPlayerData.length}</div>
                    <div class="highlight-label">Players</div>
                </div>
                <div class="highlight-card">
                    <div class="highlight-value">${squadStats.totalMatches}</div>
                    <div class="highlight-label">Total Matches</div>
                </div>
                <div class="highlight-card">
                    <div class="highlight-value">${squadStats.totalKills.toLocaleString()}</div>
                    <div class="highlight-label">Total Kills</div>
                </div>
                <div class="highlight-card">
                    <div class="highlight-value">${squadKD}</div>
                    <div class="highlight-label">Squad K/D</div>
                </div>
                <div class="highlight-card">
                    <div class="highlight-value">${squadWinRate}%</div>
                    <div class="highlight-label">Win Rate</div>
                </div>
                <div class="highlight-card">
                    <div class="highlight-value name">${bestKD ? bestKD.name : 'N/A'}</div>
                    <div class="highlight-label">Best K/D (${bestKD ? bestKD.stats.kd : '0'})</div>
                </div>
            </div>
            ${bestStack ? `
                <div style="margin-top: 30px; text-align: center;">
                    <h3 style="color: #ff758c; margin-bottom: 15px;">Best 5-Stack (min. 3 games)</h3>
                    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 20px; max-width: 600px; margin: 0 auto;">
                        <div style="font-size: 1.1rem; margin-bottom: 10px; color: #fff;">
                            ${bestStack.players.join(', ')}
                        </div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #ff4655; margin-bottom: 5px;">
                            ${bestStack.winRate}% Win Rate
                        </div>
                        <div style="color: #aaa; font-size: 0.9rem;">
                            ${bestStack.wins}-${bestStack.total - bestStack.wins} (${bestStack.total} games)
                        </div>
                    </div>
                    ${allStacks.length > 1 ? `
                        <button onclick="toggleAllStacks()" style="margin-top: 20px; background: rgba(255, 70, 85, 0.2); border: 1px solid #ff4655; color: #ff4655; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: bold; transition: all 0.3s;" onmouseover="this.style.background='rgba(255, 70, 85, 0.3)'" onmouseout="this.style.background='rgba(255, 70, 85, 0.2)'">
                            View All ${allStacks.length} Squad Compositions
                        </button>
                        <div id="all-stacks-container" style="display: none; margin-top: 20px;">
                            <div style="max-width: 800px; margin: 0 auto;">
                                ${allStacks.map((stack, index) => `
                                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 15px; margin-bottom: 10px; text-align: left;">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div style="flex: 1;">
                                                <div style="color: #aaa; font-size: 0.8rem; margin-bottom: 5px;">#${index + 1}</div>
                                                <div style="font-size: 0.95rem; color: #fff; margin-bottom: 5px;">
                                                    ${stack.players.join(', ')}
                                                </div>
                                                <div style="color: #aaa; font-size: 0.85rem;">
                                                    ${stack.wins}-${stack.total - stack.wins} (${stack.total} games)
                                                </div>
                                            </div>
                                            <div style="font-size: 1.3rem; font-weight: bold; color: ${index === 0 ? '#ff4655' : '#ff758c'}; margin-left: 20px;">
                                                ${stack.winRate}%
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>

        <div class="players-section">
            <h2>Individual Stats</h2>
            <p class="subtitle">Squad Data Only - 5 Stacks</p>
            <div class="players-grid" id="players-grid">
    `;

    allPlayerData.forEach((player, index) => {
        const s = player.stats;
        const maxMapKills = s.sortedMaps[0] ? s.sortedMaps[0][1] : 1;
        const cardUrl = player.cardId
            ? `https://media.valorant-api.com/playercards/${player.cardId}/smallart.png`
            : '';
        const rankIconUrl = player.rankTier
            ? `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${player.rankTier}/smallicon.png`
            : '';

        content += `
            <div class="player-card" id="player-${index}" onclick="togglePlayer(${index})">
                <div class="player-header">
                    <div class="player-avatar" style="${cardUrl ? `background-image: url('${cardUrl}');` : ''}">${player.name[0].toUpperCase()}</div>
                    <div class="player-info">
                        <h3>${player.name}</h3>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span class="tag">#${player.tag || '???'}</span>
                            ${rankIconUrl ? `<img src="${rankIconUrl}" alt="${player.rank || 'Rank'}" style="width: 20px; height: 20px;" title="${player.rank || 'Rank'}">` : ''}
                        </div>
                    </div>
                </div>
                <div class="player-summary">
                    <div class="player-summary-stat">
                        <div class="value">${s.matchCount}</div>
                        <div class="label">Matches</div>
                    </div>
                    <div class="player-summary-stat">
                        <div class="value">${s.kd}</div>
                        <div class="label">K/D</div>
                    </div>
                    <div class="player-summary-stat">
                        <div class="value">${s.winRate}%</div>
                        <div class="label">Win</div>
                    </div>
                </div>
                <p class="click-hint">Click for details</p>

                <div class="player-details" id="details-${index}">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${s.totalKills}</div>
                            <div class="stat-label">Kills</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${s.totalDeaths}</div>
                            <div class="stat-label">Deaths</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${s.totalAssists}</div>
                            <div class="stat-label">Assists</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${s.wins}</div>
                            <div class="stat-label">Wins</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${s.headshotPercent}%</div>
                            <div class="stat-label">HS %</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${s.topAgent ? s.topAgent[0] : 'N/A'}</div>
                            <div class="stat-label">Top Agent</div>
                        </div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${s.aces || 0}</div>
                            <div class="stat-label">Aces</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${s.firstBloods || 0}</div>
                            <div class="stat-label">First Bloods</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${s.knifeKills || 0}</div>
                            <div class="stat-label">Knife Kills</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${s.knifeDeaths || 0}</div>
                            <div class="stat-label">Knife Deaths</div>
                        </div>
                    </div>

                    ${s.mostPlayedStack ? `
                    <div class="best-match">
                        <h4>Most Played Stack</h4>
                        <div class="stack-names">${s.mostPlayedStack.join(', ')}</div>
                    </div>
                    ` : ''}

                    ${s.bestMatch ? `
                    <div class="best-match">
                        <h4>Best Match</h4>
                        <div class="best-match-stats">
                            <div class="best-match-stat">
                                <span>${s.bestMatch.player.stats.kills}</span>
                                <span>Kills</span>
                            </div>
                            <div class="best-match-stat">
                                <span>${s.bestMatch.player.stats.deaths}</span>
                                <span>Deaths</span>
                            </div>
                            <div class="best-match-stat">
                                <span>${s.bestMatch.match.metadata.map.name}</span>
                                <span>Map</span>
                            </div>
                            <div class="best-match-stat">
                                <span>${s.bestMatch.player.agent.name}</span>
                                <span>Agent</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <div class="maps-section">
                        <h4>Kills by Map</h4>
                        ${s.sortedMaps.slice(0, 5).map(([map, kills, games]) => `
                            <div class="map-bar">
                                <span class="map-name">${map} (${games})</span>
                                <div class="map-bar-fill" style="width: ${(kills / maxMapKills) * 50}%">${kills}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    content += `
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = content;
}

function togglePlayer(index) {
    const card = document.getElementById(`player-${index}`);
    const details = document.getElementById(`details-${index}`);
    const hint = card.querySelector('.click-hint');

    // Close all other expanded cards
    document.querySelectorAll('.player-card.expanded').forEach(c => {
        if (c.id !== `player-${index}`) {
            c.classList.remove('expanded');
            c.querySelector('.player-details').classList.remove('expanded');
            c.querySelector('.click-hint').textContent = 'Click for details';
        }
    });

    card.classList.toggle('expanded');
    details.classList.toggle('expanded');
    hint.textContent = details.classList.contains('expanded') ? 'Click to collapse' : 'Click for details';
}

function toggleAllStacks() {
    const container = document.getElementById('all-stacks-container');
    const button = event.target;

    if (container.style.display === 'none') {
        container.style.display = 'block';
        button.textContent = 'Hide Squad Compositions';
    } else {
        container.style.display = 'none';
        const allStacksCount = container.querySelectorAll('div[style*="background: rgba(255, 255, 255, 0.03)"]').length;
        button.textContent = `View All ${allStacksCount} Squad Compositions`;
    }
}

loadAllData();
