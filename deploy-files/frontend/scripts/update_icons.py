import os

os.chdir(os.path.dirname(__file__) + "/..")

# Update BookingList icons
with open('src/modules/Business/BookingList.tsx', 'r', encoding='utf-8') as f:
    bl = f.read()

old_icon = "icon={<Package size={14} className={r.manifestFileUrl ? 'text-blue-500' : 'text-slate-400'} />}"
new_icon = "icon={<Package size={14} className={r.manifestFileUrl ? 'text-blue-500' : 'text-orange-500'} fill=\"currentColor\" />}"

if old_icon in bl:
    bl = bl.replace(old_icon, new_icon, 1)
    with open('src/modules/Business/BookingList.tsx', 'w', encoding='utf-8') as f:
        f.write(bl)
    print('BookingList: icon updated')
else:
    print('BookingList: pattern not found')
    # Find similar line
    for line in bl.split('\n'):
        if 'Package size={14}' in line:
            print('  Found:', line.strip())

# Update MawbList active table docs column icons
with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    ml = f.read()

# Fix icon in docs column (not the pendingCols one that was just added)
# Pattern: the docs column with hasManifest check
old_mawb = "{hasManifest ? 'text-blue-600 border-blue-600' : 'text-red-500 border-red-500'}"
new_mawb = "{hasManifest ? 'text-blue-500' : 'text-orange-500'} fill=\"currentColor\""
if old_mawb in ml:
    # We need to replace the whole className attribute
    # Let's find and fix the docs column buttons
    ml = ml.replace(
        "className={(hasManifest ? 'text-blue-600 border-blue-600' : 'text-red-500 border-red-500') + ' text-[11px]'}",
        "className={hasManifest ? 'text-blue-500' : 'text-orange-500'} fill=\"currentColor\""
    )
    with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
        f.write(ml)
    print('MawbList active table: docs icon updated')
else:
    print('MawbList: pattern not found')

# Also fix the drawer docs buttons
for old, new in [
    ("className={b?.manifestFileUrl ? 'text-blue-600' : 'text-red-500'}\n                      onClick={() => {\n                        if (b?.manifestFileUrl) triggerDownload(b.manifestFileUrl);\n                        else if (b) { setManifestTarget(b); setManifestModalOpen(true); }\n                      }}>\n                      {t('operation.manifest')||'Manifest'}",
     "icon={<Package size={14} className={b?.manifestFileUrl ? 'text-blue-500' : 'text-orange-500'} fill=\"currentColor\" />}\n                      onClick={() => {\n                        if (b?.manifestFileUrl) triggerDownload(b.manifestFileUrl);\n                        else if (b) { setManifestTarget(b); setManifestModalOpen(true); }\n                      }}>\n                      {t('operation.manifest')||'Manifest'}"
    ),
    ("className={selectedMawb.draftFileUrl ? 'text-blue-600' : 'text-red-500'}\n                      onClick={() => {\n                        if (selectedMawb.draftFileUrl) triggerDownload(selectedMawb.draftFileUrl);\n                        else { setDraftTarget(selectedMawb); setDraftModalOpen(true); }\n                      }}>\n                      {t('operation.steps.draft')||'Draft'}",
     "icon={<FileText size={14} className={selectedMawb.draftFileUrl ? 'text-blue-500' : 'text-orange-500'} fill=\"currentColor\" />}\n                      onClick={() => {\n                        if (selectedMawb.draftFileUrl) triggerDownload(selectedMawb.draftFileUrl);\n                        else { setDraftTarget(selectedMawb); setDraftModalOpen(true); }\n                      }}>\n                      {t('operation.steps.draft')||'Draft'}"
    ),
]:
    if old in ml:
        ml = ml.replace(old, new, 1)
        print('Drawer button updated')
    else:
        print('Drawer button pattern not found')

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(ml)

print('Done')
