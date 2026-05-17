import os
os.chdir(os.path.dirname(__file__) + "/..")

with open('src/modules/Operation/MawbList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_warehouse = """      {/* Warehouse Entry Modal */}
      <Modal title={t('operation.steps.warehouse')} open={warehouseModalOpen} width={650}
        onCancel={() => setWarehouseModalOpen(false)} onOk={() => warehouseForm.submit()}>
        <Form form={warehouseForm} layout="vertical" onFinish={handleWarehouseEntry}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="grossWeight" label={`${t('operation.grossWeight')} (KG)`} rules={[{ required: true }]}>
                <InputNumber className="w-full" precision={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="chargeableWeight" label={`${t('operation.chargeableWeight')} (KG)`} rules={[{ required: true }]}>
                <InputNumber className="w-full" precision={2} readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actualPieces" label="Actual PCS" rules={[{ required: true }]}>
                <InputNumber className="w-full" min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={t('operation.dimensions') + ' (cm, L×W×H)'}>
            <Form.List name="dims">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rest }) => (
                    <Row key={key} gutter={8} className="mb-2 items-center">
                      <Col span={6}><Form.Item {...rest} name={[name, 'l']} noStyle rules={[{ required: true }]}><InputNumber placeholder="L" className="w-full" /></Form.Item></Col>
                      <Col span={6}><Form.Item {...rest} name={[name, 'w']} noStyle rules={[{ required: true }]}><InputNumber placeholder="W" className="w-full" /></Form.Item></Col>
                      <Col span={6}><Form.Item {...rest} name={[name, 'h']} noStyle rules={[{ required: true }]}><InputNumber placeholder="H" className="w-full" /></Form.Item></Col>
                      <Col span={6}><Button danger type="link" onClick={() => remove(name)}>Remove</Button></Col>
                    </Row>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<Plus size={14} />}>{t('operation.addDim')}</Button>
                </>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item name="remarks" label="Remarks"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>"""

new_warehouse = """      {/* Warehouse Entry Modal */}
      <Modal title={t('operation.steps.warehouse')} open={warehouseModalOpen} width={650}
        onCancel={() => setWarehouseModalOpen(false)} onOk={() => warehouseForm.submit()}>
        <Form form={warehouseForm} layout="vertical" onFinish={handleWarehouseEntry}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="grossWeight" label={`${t('operation.grossWeight')} (KG)`} rules={[{ required: true }]}>
                <InputNumber className="w-full" precision={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="chargeableWeight" label={`${t('operation.chargeableWeight')} (KG)`} rules={[{ required: true }]}>
                <InputNumber className="w-full" precision={2} readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actualPieces" label={t('common.pieces') || 'Actual PCS'} rules={[{ required: true }]}>
                <InputNumber className="w-full" min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={t('operation.dimensions') + ' (cm, L×W×H)'}>
            <Form.List name="dims">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rest }) => (
                    <Row key={key} gutter={8} className="mb-2 items-center">
                      <Col span={6}>
                        <Form.Item {...rest} name={[name, 'l']} noStyle rules={[{ required: true }]}>
                          <InputNumber id={`dim_input_${name}_l`} placeholder="L" className="w-full"
                            onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); add(); setTimeout(() => { const next = document.getElementById(`dim_input_${name + 1}_l`); if (next) { (next as HTMLInputElement).focus(); (next as HTMLInputElement).select(); } }, 100); } }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item {...rest} name={[name, 'w']} noStyle rules={[{ required: true }]}>
                          <InputNumber id={`dim_input_${name}_w`} placeholder="W" className="w-full"
                            onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); add(); setTimeout(() => { const next = document.getElementById(`dim_input_${name + 1}_l`); if (next) { (next as HTMLInputElement).focus(); (next as HTMLInputElement).select(); } }, 100); } }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item {...rest} name={[name, 'h']} noStyle rules={[{ required: true }]}>
                          <InputNumber id={`dim_input_${name}_h`} placeholder="H" className="w-full"
                            onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); add(); setTimeout(() => { const next = document.getElementById(`dim_input_${name + 1}_l`); if (next) { (next as HTMLInputElement).focus(); (next as HTMLInputElement).select(); } }, 100); } }} />
                        </Form.Item>
                      </Col>
                      <Col span={6} className="flex items-center"><Button onClick={() => remove(name)} type="link" danger className="px-0">{t('common.delete') || 'Remove'}</Button></Col>
                    </Row>
                  ))}
                  <Tooltip title="Ctrl+Enter">
                    <Button type="dashed" onClick={() => add()} block icon={<Plus size={14} />}>{t('operation.addDim')}</Button>
                  </Tooltip>
                </>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item name="remarks" label={t('common.remarks') || 'Remarks'}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>"""

if old_warehouse in content:
    content = content.replace(old_warehouse, new_warehouse, 1)
    print('Warehouse modal updated')
else:
    print('Warehouse modal: pattern not found')
    idx = content.find('Warehouse Entry Modal')
    if idx >= 0: print(content[idx:idx+1200])

with open('src/modules/Operation/MawbList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
