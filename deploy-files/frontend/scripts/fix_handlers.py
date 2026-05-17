import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update warehouse handler
content = content.replace(
    "`[Returned] ${ri.subMawb}: ${ri.reason}`",
    "`[Warehouse Returned] ${ri.subMawb}: ${ri.reason} @ ${dayjs().format('YYYY-MM-DD HH:mm')}`",
    1
)

# Update customs handler
content = content.replace(
    "`[Customs Exception] ${ri.subMawb}: ${ri.reason}`",
    "`[Customs Exception] ${ri.subMawb}: ${ri.reason} @ ${dayjs().format('YYYY-MM-DD HH:mm')}`",
    1
)

# Update terminal handler
content = content.replace(
    "`[Terminal Exception] ${ri.subMawb}: ${ri.reason}`",
    "`[Terminal Security Exception] ${ri.subMawb}: ${ri.reason} @ ${dayjs().format('YYYY-MM-DD HH:mm')}`",
    1
)

# Update MAWB drawer exception check
old = "selectedMawb.remarks && (selectedMawb.remarks.includes('Exception') || selectedMawb.remarks.includes('[Returned]'))"
new = "selectedMawb.remarks && (selectedMawb.remarks.includes('Exception') || selectedMawb.remarks.includes('Returned'))"
content = content.replace(old, new, 1)

old = "l.includes('Exception') || l.includes('[Returned]')).map((l: string, i: number)"
new = "l.includes('Exception') || l.includes('Returned')).map((l: string, i: number)"
content = content.replace(old, new, 1)

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
