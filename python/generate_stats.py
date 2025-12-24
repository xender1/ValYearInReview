"""
Preprocesses match JSON files into a compact stats.json for the year-in-review page.
This reduces ~600MB of match data down to ~10KB of aggregated stats.
"""

import json
import os
from pathlib import Path

PLAYERS = [
    {'file': 'ScrubCity_matches.json', 'name': 'ScrubCity', 'tag': '30fps'},
    {'file': 'brassbonanza_matches.json', 'name': 'brassbonanza', 'tag': None},
    {'file': 'CoorsMaverick_matches.json', 'name': 'CoorsMaverick', 'tag': '3013'},
    {'file': 'Dbeezy_matches.json', 'name': 'Dbeezy', 'tag': None},
    {'file': 'DReesesPuffs_matches.json', 'name': 'DReesesPuffs', 'tag': '6676'},
    {'file': 'madyson_matches.json', 'name': 'madyson', 'tag': 'sad'},
    {'file': 'Sax0pwn_matches.json', 'name': 'Sax0pwn', 'tag': None},
    {'file': 'Snipes_matches.json', 'name': 'Snipes', 'tag': None},
    {'file': 'Kemosabe_matches.json', 'name': 'Kemosabe', '6818': None},
    {'file': 'StansPlan_matches.json', 'name': 'StansPlan', 'NA1': None},
]


def find_player_in_match(match, player_name):
    """Find player data in a match by name (case-insensitive)."""
    for player in match['players']:
        if player['name'].lower() == player_name.lower():
            return player
    return None


def calculate_player_stats(matches, player_name, player_tag):
    """Calculate all stats for a player from their matches."""
    total_kills = 0
    total_deaths = 0
    total_assists = 0
    total_headshots = 0
    total_bodyshots = 0
    total_legshots = 0
    wins = 0
    match_count = 0
    best_kills = 0
    best_match = None
    kills_by_map = {}
    agents = {}
    total_aces = 0
    total_first_bloods = 0
    knife_kills = 0
    knife_deaths = 0

    # Find actual tag if not specified
    actual_tag = player_tag
    if not actual_tag and matches:
        for match in matches:
            player = find_player_in_match(match, player_name)
            if player:
                actual_tag = player['tag']
                break

    for match in matches:
        player = find_player_in_match(match, player_name)
        if not player:
            continue

        match_count += 1
        stats = player['stats']
        map_name = match['metadata']['map']['name']

        total_kills += stats['kills']
        total_deaths += stats['deaths']
        total_assists += stats['assists']
        total_headshots += stats['headshots']
        total_bodyshots += stats['bodyshots']
        total_legshots += stats['legshots']

        # Track best match
        if stats['kills'] > best_kills:
            best_kills = stats['kills']
            best_match = {
                'kills': stats['kills'],
                'deaths': stats['deaths'],
                'assists': stats['assists'],
                'map': map_name,
                'agent': player['agent']['name'],
                'date': match['metadata']['started_at'][:10]
            }

        # Track kills by map
        kills_by_map[map_name] = kills_by_map.get(map_name, 0) + stats['kills']

        # Track agent usage
        agent_name = player['agent']['name']
        agents[agent_name] = agents.get(agent_name, 0) + 1

        # Count aces (5 kills in a round) from rounds data
        rounds = match.get('rounds', [])
        for round_data in rounds:
            round_stats = round_data.get('stats', [])
            for player_round_stats in round_stats:
                if player_round_stats['player']['name'].lower() == player_name.lower():
                    if player_round_stats['stats']['kills'] >= 5:
                        total_aces += 1
                    break

        # Count first bloods from kills data
        kills = match.get('kills', [])
        # Group kills by round and find first kill of each round
        kills_by_round = {}
        for kill in kills:
            round_num = kill['round']
            if round_num not in kills_by_round:
                kills_by_round[round_num] = kill
            elif kill['time_in_round_in_ms'] < kills_by_round[round_num]['time_in_round_in_ms']:
                kills_by_round[round_num] = kill

        # Check if player got the first blood in any round
        for first_kill in kills_by_round.values():
            if first_kill['killer']['name'].lower() == player_name.lower():
                total_first_bloods += 1

        # Count knife kills and deaths
        for kill in kills:
            weapon = kill.get('weapon')
            if weapon and weapon.get('type') == 'Melee':
                if kill['killer']['name'].lower() == player_name.lower():
                    knife_kills += 1
                if kill['victim']['name'].lower() == player_name.lower():
                    knife_deaths += 1

        # Check win/loss
        teams = match.get('teams')
        if teams:
            player_team = next((t for t in teams if t['team_id'] == player['team_id']), None)
            enemy_team = next((t for t in teams if t['team_id'] != player['team_id']), None)
            if player_team and enemy_team:
                if player_team['rounds']['won'] > enemy_team['rounds']['won']:
                    wins += 1

    # Calculate derived stats
    total_shots = total_headshots + total_bodyshots + total_legshots
    headshot_percent = round((total_headshots / total_shots) * 100, 1) if total_shots > 0 else 0
    kd = round(total_kills / total_deaths, 2) if total_deaths > 0 else total_kills
    win_rate = round((wins / match_count) * 100) if match_count > 0 else 0

    # Sort maps and agents
    sorted_maps = sorted(kills_by_map.items(), key=lambda x: x[1], reverse=True)
    top_agent = max(agents.items(), key=lambda x: x[1]) if agents else None

    return {
        'name': player_name,
        'tag': actual_tag,
        'matchCount': match_count,
        'totalKills': total_kills,
        'totalDeaths': total_deaths,
        'totalAssists': total_assists,
        'totalHeadshots': total_headshots,
        'wins': wins,
        'headshotPercent': headshot_percent,
        'kd': kd,
        'winRate': win_rate,
        'topAgent': list(top_agent) if top_agent else None,
        'sortedMaps': sorted_maps[:5],  # Top 5 maps only
        'bestMatch': best_match,
        'aces': total_aces,
        'firstBloods': total_first_bloods,
        'knifeKills': knife_kills,
        'knifeDeaths': knife_deaths
    }


def main():
    script_dir = Path(__file__).parent
    all_player_stats = []

    for player_config in PLAYERS:
        file_path = script_dir / player_config['file']

        if not file_path.exists():
            print(f"Skipping {player_config['file']} - file not found")
            continue

        print(f"Processing {player_config['file']}...")
        with open(file_path, 'r') as f:
            matches = json.load(f)

        stats = calculate_player_stats(
            matches,
            player_config['name'],
            player_config['tag']
        )
        all_player_stats.append(stats)
        print(f"  -> {stats['matchCount']} matches, {stats['totalKills']} kills, {stats['kd']} K/D")

    # Write compact JSON to parent directory (where year-in-review.html is)
    output_path = script_dir.parent / 'stats.json'
    with open(output_path, 'w') as f:
        json.dump(all_player_stats, f, separators=(',', ':'))

    # Also write a readable version for debugging
    output_path_pretty = script_dir / 'stats_pretty.json'
    with open(output_path_pretty, 'w') as f:
        json.dump(all_player_stats, f, indent=2)

    file_size = output_path.stat().st_size
    print(f"\nGenerated {output_path}")
    print(f"File size: {file_size:,} bytes ({file_size / 1024:.1f} KB)")


if __name__ == '__main__':
    main()
