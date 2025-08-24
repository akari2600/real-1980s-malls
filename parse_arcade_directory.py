#!/usr/bin/env python3
"""
Parse the 1991 Arcade Directory into structured CSV format
"""

import re
import csv
from typing import List, Dict, Optional

def detect_mall_keywords(text: str) -> bool:
    """
    Detect if a line contains mall/shopping center keywords
    """
    mall_keywords = [
        'mall', 'plaza', 'center', 'centre', 'square', 'marketplace', 
        'galleria', 'promenade', 'commons', 'crossing', 'junction',
        'village', 'town center', 'shopping', 'outlet', 'bazaar',
        'emporium', 'arcade', 'court', 'walk', 'row', 'place',
        'park', 'station', 'terminal', 'concourse', 'atrium'
    ]
    
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in mall_keywords)

def parse_city_state_zip(line: str) -> tuple:
    """
    Parse the city, state, zip line
    Returns: (city, state, zip)
    """
    # Pattern: CITY  STATE  ZIP
    # Handle cases like "CHICOPEE FALLS  MA  01020-5007"
    parts = line.strip().split()
    if len(parts) >= 3:
        zip_code = parts[-1]
        state = parts[-2]
        city = ' '.join(parts[:-2])
        return city, state, zip_code
    return line.strip(), '', ''

def parse_arcade_entry(lines: List[str]) -> Optional[Dict]:
    """
    Parse a single arcade entry from a list of lines
    Based on observed pattern:
    - Business name
    - Empty line
    - Address (with dashes)
    - Empty line  
    - Optional mall/center name
    - Empty line
    - City State ZIP
    - Empty line
    - Space separator
    """
    if not lines:
        return None
    
    non_empty_lines = [line.strip() for line in lines if line.strip()]
    if len(non_empty_lines) < 2:
        return None
    
    # First non-empty line is business name
    business_name = non_empty_lines[0]
    
    # Last non-empty line is city/state/zip
    city_state_zip_line = non_empty_lines[-1]
    city, state, zip_code = parse_city_state_zip(city_state_zip_line)
    
    # Parse middle lines for address and mall
    address_lines = []
    mall_name = ""
    is_mall = False
    
    # Process lines between business name and city/state/zip
    for line in non_empty_lines[1:-1]:
        if line.startswith('-') or line.startswith('0'):
            # Address line - clean up leading dashes/zeros
            clean_address = re.sub(r'^[-0]+\s*', '', line)
            address_lines.append(clean_address)
        elif line.startswith('P O BOX') or line.startswith('PO BOX'):
            # PO Box is part of address
            address_lines.append(line)
        else:
            # Standalone line - likely mall/center name or additional address
            if detect_mall_keywords(line):
                mall_name = line
                is_mall = True
            else:
                # Could be mall without keywords or additional address info
                # For now, treat as potential mall name for manual review
                if not mall_name:  # Only if we don't already have a mall name
                    mall_name = line
    
    # Join address lines
    full_address = ', '.join(address_lines) if address_lines else ""
    
    # Final mall detection check
    if not is_mall and mall_name:
        is_mall = detect_mall_keywords(mall_name)
    
    # Also check business name for mall indicators
    if not is_mall:
        is_mall = detect_mall_keywords(business_name)
    
    return {
        'business_name': business_name,
        'address': full_address,
        'mall_center': mall_name,
        'city': city,
        'state': state,
        'zip': zip_code,
        'mall': is_mall,
        'raw_entry': '\n'.join(lines)
    }

def parse_arcade_directory(input_file: str, output_file: str):
    """
    Parse the entire arcade directory file
    """
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split into lines and skip header
    lines = content.split('\n')
    
    # Find where the actual data starts (after "To home page")
    start_idx = 0
    for i, line in enumerate(lines):
        if 'To home page' in line:
            start_idx = i + 1
            break
    
    # Parse entries - look for the single space separator pattern
    entries = []
    current_entry_lines = []
    
    for i, line in enumerate(lines[start_idx:]):
        # Check if this is the single space separator (entry boundary)
        if line == ' ' and current_entry_lines:
            # End of current entry
            entry = parse_arcade_entry(current_entry_lines)
            if entry:
                entries.append(entry)
            current_entry_lines = []
        else:
            # Add line to current entry (including empty lines within entry)
            current_entry_lines.append(line)
    
    # Don't forget the last entry
    if current_entry_lines:
        entry = parse_arcade_entry(current_entry_lines)
        if entry:
            entries.append(entry)
    
    # Write to CSV
    fieldnames = ['business_name', 'address', 'mall_center', 'city', 'state', 'zip', 'mall']
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for entry in entries:
            # Only write the fields we want in CSV (exclude raw_entry)
            csv_entry = {k: v for k, v in entry.items() if k in fieldnames}
            writer.writerow(csv_entry)
    
    print(f"Parsed {len(entries)} arcade entries")
    print(f"Mall locations detected: {sum(1 for e in entries if e['mall'])}")
    print(f"Output written to: {output_file}")
    
    # Print some examples for verification
    print("\nFirst 5 entries:")
    for i, entry in enumerate(entries[:5]):
        print(f"{i+1}. {entry['business_name']} - {entry['city']}, {entry['state']} - Mall: {entry['mall']}")

if __name__ == "__main__":
    input_file = "1991-arcade-directory-raw.txt"
    output_file = "1991-arcade-directory-parsed.csv"
    parse_arcade_directory(input_file, output_file)
