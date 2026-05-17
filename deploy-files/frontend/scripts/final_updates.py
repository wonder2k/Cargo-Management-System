import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix gap in finishedCols Docs column: gap-1 -> gap-3 for manifest+printer row
content = content.replace(
    '<div className="flex items-center gap-1">',
    '<div className="flex items-center gap-3">',
    1  # only first occurrence (the finishedCols one)
)

# 2. Add returned items section after dimensions in warehouse modal
old_end = """                  <Tooltip title="Ctrl+Enter">
                    <Button type="dashed" onClick={() => add()} block icon={<Plus size={14} />}>{t('operation.addDim')}</Button>
                  </Tooltip>
                </>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item name="remarks" label={t('common.remarks') || 'Remarks'}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>"""

new_end = """                  <Tooltip title="Ctrl+Enter">
                    <Button type="dashed" onClick={() => add()} block icon={<Plus size={14} />}>{t('operation.addDim')}</Button>
                  </Tooltip>
                </>
              )}
            </Form.List>
          </Form.Item>
          <Divider orientation="left" className="text-xs">{t('operation.returnedItems')}</Divider>
          <Form.List name="returnedItems">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" className="mb-2 bg-red-50">
                    <Row gutter={8}>
                      <Col span={12}><Form.Item {...restField} name={[name, 'subMawb']} label="Sub-ID" rules={[{ required: true }]}><Input /></Form.Item></Col>
                      <Col span={12}><Form.Item {...restField} name={[name, 'reason']} label={t('operation.reason')} rules={[{ required: true }]}><Input /></Form.Item></Col>
                    </Row>
                    <Button size="small" danger onClick={() => remove(name)}>{t('common.delete')}</Button>
                  </Card>
                ))}
                <Button type="link" onClick={() => add()} icon={<Info size={14} />}>{t('operation.returnedItems')}</Button>
              </>
            )}
          </Form.List>
          <Form.Item name="remarks" label={t('common.remarks') || 'Remarks'}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>"""

if old_end in content:
    content = content.replace(old_end, new_end, 1)
    print('Warehouse modal returned items added')
else:
    print('Warehouse modal end: pattern not found')
    idx = content.find('<Form.Item name="remarks"')
    if idx >= 0: print(content[idx:idx+300])

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
