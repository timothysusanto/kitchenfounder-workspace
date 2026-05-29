# Read the broken file and fix the CSS split issue
with open('/workspace/mission-control/index.html', 'r') as f:
    content = f.read()

# Find the first </style> and second </style>
first_close = content.find('</style>')
second_close = content.find('</style>', first_close + 1)

print(f"First </style> at line: {content[:first_close].count(chr(10)) + 1}")
print(f"Second </style> at line: {content[:second_close].count(chr(10)) + 1}")

# Extract the CSS that's between the two </style> tags (the broken part)
between = content[first_close + len('</style>'):second_close]
print(f"CSS outside style block: {len(between)} chars")
print("First 200 chars of orphaned CSS:")
print(between[:200])
