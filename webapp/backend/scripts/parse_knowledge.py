import yaml
import os
import json

def parse_all_cards(base_dir: str):
    all_cards = []
    all_edges = []

    for root, dirs, files in os.walk(base_dir):
        for fname in files:
            if not fname.endswith('.yaml'):
                continue
            path = os.path.join(root, fname)
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()
            # Fix Chinese quotes that break YAML parsing
            text = text.replace('\u201c', "'")
            text = text.replace('\u201d', "'")
            text = text.replace('\u2018', "'")
            text = text.replace('\u2019', "'")
            try:
                docs = list(yaml.safe_load_all(text))
                for doc in docs:
                    if doc and isinstance(doc, dict) and 'content_id' in doc:
                        rel = doc.get('related_content', {}) or {}
                        knowledge = doc.get('knowledge', {}) or {}
                        card = {
                            'id': doc.get('content_id'),
                            'title': doc.get('title'),
                            'subtitle': doc.get('subtitle', ''),
                            'category': os.path.basename(os.path.dirname(path)),
                            'discipline': os.path.basename(os.path.dirname(os.path.dirname(path))),
                            'tags': doc.get('tags', []),
                            'difficulty': doc.get('difficulty', 1),
                            'definition': knowledge.get('definition', ''),
                            'explanation': knowledge.get('explanation', ''),
                            'analogy': knowledge.get('analogy', ''),
                            'examples': [
                                f"[{e.get('context', '')}] {e.get('description', '')}"
                                for e in (knowledge.get('examples') or [])
                            ],
                            'prerequisites': rel.get('prerequisites', []),
                            'extensions': rel.get('extensions', []),
                        }
                        all_cards.append(card)
            except Exception as e:
                print(f'ERR: {path} -> {e}')

    # Build ID mapping: short_id -> full_id
    id_map = {}
    for card in all_cards:
        full_id = card['id']
        # Strip version suffix like -v1.0 to get short_id
        short_id = full_id.rsplit('-v', 1)[0] if '-v' in full_id else full_id
        id_map[short_id] = full_id
        # Also map full_id to itself
        id_map[full_id] = full_id

    # Build edges with mapped IDs
    for card in all_cards:
        full_id = card['id']
        for pre in card['prerequisites']:
            mapped = id_map.get(pre, pre)
            if mapped in id_map.values():
                all_edges.append({'source': mapped, 'target': full_id, 'type': 'prerequisite'})
        for ext in card['extensions']:
            mapped = id_map.get(ext, ext)
            if mapped in id_map.values():
                all_edges.append({'source': full_id, 'target': mapped, 'type': 'extension'})

    return all_cards, all_edges


if __name__ == '__main__':
    from pathlib import Path

    repo_root = Path(__file__).resolve().parents[3]
    base = str(repo_root / '知识卡片库')
    cards, edges = parse_all_cards(base)
    print(f'Total cards: {len(cards)}')
    for c in cards:
        print(f"  [{c['discipline']}/{c['category']}] {c['id']}: {c['title']}")
    print(f'Total edges: {len(edges)}')

    # Save to JSON for backend use
    output = {
        'nodes': cards,
        'edges': edges,
    }
    out_path = repo_root / 'webapp' / 'backend' / 'app' / 'data' / 'knowledge_graph.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f'Saved to {out_path}')
