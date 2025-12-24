import requests
import json
import time
from urllib.parse import quote


def get_account(name, tag, token=None, force=None):
    """Fetch account info by name and tag"""
    url = f"https://api.henrikdev.xyz/valorant/v2/account/{quote(name)}/{quote(tag)}"

    if force:
        url += "?force=true"

    headers = {"User-Agent": "unofficial-valorant-api/python"}
    if token:
        headers["Authorization"] = token

    response = requests.get(url, headers=headers)

    return {
        "status": response.status_code,
        "data": response.json().get("data") if response.ok else None,
        "ratelimits": {
            "used": response.headers.get("x-ratelimit-limit"),
            "remaining": response.headers.get("x-ratelimit-remaining"),
            "reset": response.headers.get("x-ratelimit-reset"),
        },
        "error": response.json() if not response.ok else None,
    }


def get_all_matches(name, tag, region, platform="pc", token=None, mode=None, map=None, start_from=0, output_file="all_matches.json"):
    """Fetch all match history using pagination, appending to file as we go"""
    # Load existing matches if resuming
    if start_from > 0:
        try:
            with open(output_file, "r") as f:
                all_matches = json.load(f)
            print(f"Resuming from start={start_from}, loaded {len(all_matches)} existing matches")
        except FileNotFoundError:
            all_matches = []
    else:
        all_matches = []

    start = start_from
    size = 10  # max per request

    headers = {"User-Agent": "unofficial-valorant-api/python"}
    if token:
        headers["Authorization"] = token

    pud = "fc2ba0fa-16bd-5b63-9fab-9d9b8b848430"

    while True:
        print(f"\n--- Fetching start={start} ---")
        url = f"https://api.henrikdev.xyz/valorant/v4/matches/{region}/{platform}/{quote(name)}/{quote(tag)}"
        #url = f"https://api.henrikdev.xyz/valorant/v4/by-puuid/matches/{region}/{platform}/{pud}"

        params = {"size": size, "start": start}
        if mode:
            params["mode"] = mode
        if map:
            params["map"] = map

        response = requests.get(url, headers=headers, params=params)

        if response.status_code != 200:
            print(f"Error: {response.status_code}")
            print(f"To resume, use start_from={start}")
            break

        data = response.json()
        matches = data.get("data", [])

        if not matches:
            print("No more matches")
            break

        # Filter for 2025 matches only, stop if we hit 2024
        stop_fetching = False
        new_matches = []
        for match in matches:
            started_at = match["metadata"]["started_at"]  # e.g. "2025-12-18T07:13:14.185Z"
            year = int(started_at[0:4])  # Extract year from ISO date
            if year == 2025:
                new_matches.append(match)
            elif year == 2024:
                print(f"Hit 2024 match, stopping")
                stop_fetching = True
                break

        all_matches.extend(new_matches)

        # Save after each request
        with open(output_file, "w") as f:
            json.dump(all_matches, f, indent=2)

        # Print date range for this batch
        if matches:
            first_date = matches[0]["metadata"]["started_at"][:10]  # e.g. "2025-12-18"
            last_date = matches[-1]["metadata"]["started_at"][:10]
            print(f"Dates: {first_date} to {last_date}")

        print(f"Got {len(matches)} matches this request, added {len(new_matches)} from 2025 (total: {len(all_matches)}, remaining rate limit: {response.headers.get('x-ratelimit-remaining')})")
        print(f"Saved to {output_file}")

        if stop_fetching:
            break

        if len(matches) < size:
            print("Last page reached")
            break

        start += size
        print(f"Next start will be: {start}", flush=True)

        # Respect rate limits
        remaining = int(response.headers.get("x-ratelimit-remaining", 1))
        if remaining <= 11:
            reset = int(response.headers.get("x-ratelimit-reset", 60))
            print(f"Rate limit low, waiting 65s...", flush=True)
            time.sleep(65)
        else:
            time.sleep(1)  # Small delay between requests

    print(f"\nDone! Total matches: {len(all_matches)}")
    return all_matches


if __name__ == "__main__":
    token = "HDEV-9a6912a5-18a4-4504-86d0-defc1310d27f"

    matches = get_all_matches("StansPlan", "NA1", "na", "pc", token, mode="competitive", output_file="StansPlan_matches.json")
    #with open("my_matches.json", "w") as f:
    #    json.dump(matches, f, indent=2)
"""
    #account = get_account("ScrubCity", "30fps", token)
    #with open("account.json", "w") as f:
    #    json.dump(account, f, indent=2)
    #print(f"Remaining requests: {account['ratelimits']['remaining']}")

    # Analyze kills by map
    with open("my_matches.json", "r") as f:
        matches = json.load(f)

    kills_by_map = {}
    for match in matches:
        map_name = match["metadata"]["map"]["name"]
        for player in match["players"]:
            if player["name"] == "ScrubCity" and player["tag"] == "30fps":
                kills = player["stats"]["kills"]
                if map_name not in kills_by_map:
                    kills_by_map[map_name] = 0
                kills_by_map[map_name] += kills
                break

    print("Total kills by map:")
    for map_name, kills in sorted(kills_by_map.items(), key=lambda x: x[1], reverse=True):
        print(f"  {map_name}: {kills}")

    best_map = max(kills_by_map, key=kills_by_map.get)
    print(f"\nBest map: {best_map} ({kills_by_map[best_map]} kills)")

    # Find match with most kills
    best_match = None
    best_kills = 0
    for match in matches:
        for player in match["players"]:
            if player["name"] == "ScrubCity" and player["tag"] == "30fps":
                if player["stats"]["kills"] > best_kills:
                    best_kills = player["stats"]["kills"]
                    best_match = match
                break

    print(f"\nBest match: {best_kills} kills on {best_match['metadata']['map']['name']}")
    print(f"  Date: {best_match['metadata']['started_at']}")
    print(f"  Match ID: {best_match['metadata']['match_id']}")
"""