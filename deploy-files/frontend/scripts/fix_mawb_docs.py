import re

with open('src/modules/Operation/MawbList.tsx', 'r') as f:
    content = f.read()

# Insert docs column after the cargo column closing in pendingCols
# Find: cargo column closing brace followed by status column
old = """      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      filters: [
        { text: t('booking.status.pending'), value: 'pending' },"""

new = """      ),
    },
    {
      title: t('operation.docs') || 'Docs',
      render: (_: any, r: Booking) => (
        <Button size="small"
          icon={<Package size={14} className={r.manifestFileUrl ? 'text-blue-500' : 'text-orange-500'} fill="currentColor" />}
          onClick={() => {
            if (r.manifestFileUrl) triggerDownload(r.manifestFileUrl);
            else { setManifestTarget(r); setManifestModalOpen(true); }
          }}>
          {t('operation.manifest')||'Manifest'}
        </Button>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      filters: [
        { text: t('booking.status.pending'), value: 'pending' },"""

if old in content:
    content = content.replace(old, new, 1)
    with open('src/modules/Operation/MawbList.tsx', 'w') as f:
        f.write(content)
    print('Docs column inserted successfully')
else:
    print('Could not find insertion point')
    # Debug: find the section
    idx = content.find("common.cargo")
    if idx >= 0:
        print('Found cargo column at', idx)
        print(content[idx:idx+300])
