import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Customs handler - append to existing remarks, add 17track
old = """  // Customs clearance
  const handleCustoms = async (values: any) => {
    if (!selectedMawb) return;
    const returnedText = (values.customsReturned || []).map((ri: any) => `[Customs Exception] ${ri.subMawb}: ${ri.reason} @ ${dayjs().format('YYYY-MM-DD HH:mm')}`).join('\\n');
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'customs',
        remarks: [values.customsRemark || '', returnedText].filter(Boolean).join('\\n'),
      });
      message.success(t('common.success'));
      setCustomsModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };"""

new = """  // Customs clearance
  const handleCustoms = async (values: any) => {
    if (!selectedMawb) return;
    const returnedText = (values.customsReturned || []).map((ri: any) => `[Customs Exception] ${ri.subMawb}: ${ri.reason} @ ${dayjs().format('YYYY-MM-DD HH:mm')}`).join('\\n');
    try {
      const existing = selectedMawb.remarks || '';
      const newPart = [values.customsRemark || '', returnedText].filter(Boolean).join('\\n');
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'customs',
        remarks: [existing, newPart].filter(Boolean).join('\\n'),
      });
      message.success(t('common.success'));
      setCustomsModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };"""

if old in content:
    content = content.replace(old, new, 1)
    print('1. Customs handler: append remarks + 17track')
else:
    print('1. Customs: pattern not found')

# Fix 2: Terminal handler - append to existing remarks, add 17track
old = """  // Terminal in
  const handleTerminal = async (values: any) => {
    if (!selectedMawb) return;
    const returnedText = (values.terminalReturned || []).map((ri: any) => `[Terminal Security Exception] ${ri.subMawb}: ${ri.reason} @ ${dayjs().format('YYYY-MM-DD HH:mm')}`).join('\\n');
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'terminal_in',
        remarks: [values.terminalRemark || '', returnedText].filter(Boolean).join('\\n'),
      });
      message.success(t('common.success'));
      setTerminalModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };"""

new = """  // Terminal in
  const handleTerminal = async (values: any) => {
    if (!selectedMawb) return;
    const returnedText = (values.terminalReturned || []).map((ri: any) => `[Terminal Security Exception] ${ri.subMawb}: ${ri.reason} @ ${dayjs().format('YYYY-MM-DD HH:mm')}`).join('\\n');
    try {
      const existing = selectedMawb.remarks || '';
      const newPart = [values.terminalRemark || '', returnedText].filter(Boolean).join('\\n');
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'terminal_in',
        remarks: [existing, newPart].filter(Boolean).join('\\n'),
      });
      // Auto-register with 17TRACK
      try { fetch('/api/track/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: selectedMawb.mawbNo }) }); } catch {}
      message.success(t('common.success'));
      setTerminalModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };"""

if old in content:
    content = content.replace(old, new, 1)
    print('2. Terminal handler: append remarks + 17track')
else:
    print('2. Terminal: pattern not found')

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
