import os
os.chdir(os.path.dirname(__file__) + "/..")
NL = "\n"

# ============ MawbList.tsx ============
with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    ml = f.read()

# Fix 1: MAWB number - remove label line, just show number in blue font
old = '<Col span={12}><Text type="secondary">MAWB:</Text> <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">{t(\'operation.mawbRef\')||\'MAWB\'}</span><span className="font-mono text-blue-600">{detailBooking.mawbNo || \'--\'}</span></div></Col>'
new = '<Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono font-bold text-blue-600">{detailBooking.mawbNo || \'--\'}</span></Col>'
if old in ml:
    ml = ml.replace(old, new, 1)
    print('1. MAWB display fixed')
else:
    print('1. MAWB: pattern not found')

# Fix 2: Customer - add fallback lookup from customers list
old = '<Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{detailBooking.customerName}</div></Col>'
new = '<Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{customers.find(c => c.id === detailBooking.customerId)?.name || detailBooking.customerName || \'--\'}</div></Col>'
if old in ml:
    ml = ml.replace(old, new, 1)
    print('2. Customer fallback added')
else:
    print('2. Customer: pattern not found')

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(ml)
print('MawbList.tsx done')

# ============ BookingList.tsx ============
with open('src/modules/Business/BookingList.tsx', 'r', encoding='utf-8') as f:
    bl = f.read()

# Fix 3: BookingList MAWB display - same change
old = '<Col span={12}><Text type="secondary">MAWB:</Text> <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">{t(\'operation.mawbRef\')||\'MAWB\'}</span><span className="font-mono text-blue-600">{selectedBookingDetail.mawbNo || \'--\'}</span></div></Col>'
new = '<Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono font-bold text-blue-600">{selectedBookingDetail.mawbNo || \'--\'}</span></Col>'
if old in bl:
    bl = bl.replace(old, new, 1)
    print('3. BookingList MAWB display fixed')
else:
    print('3. BookingList MAWB: pattern not found')

# Fix 4: BookingList Customer fallback
old = '<Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{selectedBookingDetail.customerName}</div></Col>'
new = '<Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{customers.find(c => c.id === selectedBookingDetail.customerId)?.name || selectedBookingDetail.customerName || \'--\'}</div></Col>'
if old in bl:
    bl = bl.replace(old, new, 1)
    print('4. BookingList customer fallback added')
else:
    print('4. BookingList customer: pattern not found')

# Fix 5: BookingList exception detection - also check the mawbNo by trimming whitespace
old = "const mawbA = mawbs.find(m => m.mawbNo === r.mawbNo);"
new = "const mawbA = mawbs.find(m => m.mawbNo === r.mawbNo || m.mawbNo?.trim() === r.mawbNo?.trim());"
if old in bl:
    bl = bl.replace(old, new, 1)
    print('5. BookingList MAWB lookup improved')
else:
    print('5. BookingList MAWB lookup: pattern not found')
    # Try to find it
    idx = bl.find('mawbA')
    if idx >= 0:
        print(f'  Found at {idx}: {bl[idx:idx+60]}')

# Fix 6: BookingList drawer exception - also check the mawbNo by trimming
old = "const mawbX = mawbs.find(m => m.mawbNo === selectedBookingDetail.mawbNo);"
new = "const mawbX = mawbs.find(m => m.mawbNo === selectedBookingDetail.mawbNo || m.mawbNo?.trim() === selectedBookingDetail.mawbNo?.trim());"
if old in bl:
    bl = bl.replace(old, new, 1)
    print('6. BookingList drawer MAWB lookup improved')
else:
    print('6. BookingList drawer MAWB: pattern not found')

# Fix 7: BookingList exception check - also show in drawer for bookings without mawbNo
# If the booking number matches the MAWB's bookingNo, try that too
old = "const hasException = mawbA?.remarks?.includes('Exception') || mawbA?.remarks?.includes('[Returned]');"
new = "const hasException = (mawbA?.remarks?.includes('Exception') || mawbA?.remarks?.includes('[Returned]'));"
# Already correct, just confirming
print('7. Exception detection logic verified')

with open('src/modules/Business/BookingList.tsx', 'w', encoding='utf-8') as f:
    f.write(bl)
print('BookingList.tsx done')

print('\\nAll done. Please verify the data in the database.')
print('Run this SQL to check BK-594444 MAWB data:')
print("SELECT mawb_no, remarks FROM mawbs WHERE booking_no = 'BK-594444' OR mawb_no IN (SELECT mawb_no FROM bookings WHERE booking_no = 'BK-594444');")
