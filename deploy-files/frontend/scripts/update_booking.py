import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Business/BookingList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add mawbs state
old_state = """  const [loading, setLoading] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);"""
new_state = """  const [mawbs, setMawbs] = useState<MAWB[]>([]);
  const [loading, setLoading] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);"""
if old_state in content:
    content = content.replace(old_state, new_state, 1)
    print('mawbs state added')
else:
    print('mawbs state: pattern not found')

# 2. Add MAWB to import
content = content.replace(
    "import { Customer, FlightRate, Booking, BookingStatus, MawbStatus } from '../../types';",
    "import { Customer, FlightRate, Booking, BookingStatus, MawbStatus, MAWB } from '../../types';"
)
print('MAWB type import added')

# 3. Add operationApi to import
content = content.replace(
    "import { businessApi, uploadApi } from '../../services/api';",
    "import { businessApi, operationApi, uploadApi } from '../../services/api';"
)
print('operationApi import added')

# 4. Update fetchData to include mawbs
old_fetch = """      const [bookRes, custRes, rateRes] = await Promise.all([
        businessApi.getBookings(),
        businessApi.getCustomers(),
        businessApi.getRates()
      ]);
      setBookings(bookRes.data);
      setCustomers(custRes.data);
      setRates(rateRes.data);"""
new_fetch = """      const [bookRes, custRes, rateRes, mawbRes] = await Promise.all([
        businessApi.getBookings(),
        businessApi.getCustomers(),
        businessApi.getRates(),
        operationApi.getMawbs()
      ]);
      setBookings(bookRes.data);
      setCustomers(custRes.data);
      setRates(rateRes.data);
      setMawbs(mawbRes.data);"""
if old_fetch in content:
    content = content.replace(old_fetch, new_fetch, 1)
    print('fetchData updated')
else:
    print('fetchData: pattern not found')

# 5. Update Docs column to add draft icon
old_docs = """          {
            title: t('operation.docs') || 'Docs',
            render: (r: Booking) => (
              <Button size="small"
                icon={<Package size={14} style={{ color: r.manifestFileUrl ? '#3b82f6' : '#f97316' }} />}
                onClick={() => {
                  if (r.manifestFileUrl) triggerDownload(r.manifestFileUrl);
                  else { setManifestTarget(r); setManifestModalOpen(true); }
                }}>
                {t('operation.manifest')||'Manifest'}
              </Button>
            ),
          },"""
new_docs = """          {
            title: t('operation.docs') || 'Docs',
            render: (r: Booking) => {
              const mawb = mawbs.find(m => m.mawbNo === r.mawbNo);
              return (
                <div className="flex flex-col gap-1">
                  <Button size="small"
                    icon={<Package size={14} style={{ color: r.manifestFileUrl ? '#3b82f6' : '#f97316' }} />}
                    onClick={() => {
                      if (r.manifestFileUrl) triggerDownload(r.manifestFileUrl);
                      else { setManifestTarget(r); setManifestModalOpen(true); }
                    }}>
                    {t('operation.manifest')||'Manifest'}
                  </Button>
                  {mawb?.draftFileUrl && (
                    <Button size="small"
                      icon={<FileText size={14} style={{ color: '#f97316' }} />}
                      onClick={() => triggerDownload(mawb.draftFileUrl!)}>
                      {t('operation.steps.draft')||'Draft'}
                    </Button>
                  )}
                </div>
              );
            },
          },"""
if old_docs in content:
    content = content.replace(old_docs, new_docs, 1)
    print('Docs column updated')
else:
    print('Docs column: pattern not found')
    idx = content.find("title: t('operation.docs')")
    if idx >= 0: print(content[idx:idx+500])

with open('src/modules/Business/BookingList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
