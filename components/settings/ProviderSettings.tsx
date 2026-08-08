'use client';

import { ManageableList }                  from '@/components/settings/ManageableList';
import type { ProviderRow, ProviderTypeRow } from '@/types/schema';

interface Props {
  providers:     ProviderRow[];
  providerTypes: ProviderTypeRow[];
}

export function ProviderSettings({ providers: initial, providerTypes }: Readonly<Props>) {
  return (
    <ManageableList
      title="Providers"
      description="Healthcare providers linked to appointments and prescriptions."
      tableName="providers"
      nameColumn="provider_type_id"
      items={initial}
      showDelete={false}
      collapsibleAdd
      addFields={[
        {
          key:     'provider_type_id',
          type:    'select',
          label:   'Type',
          parseAs: 'int',
          options: providerTypes.map(t => ({ value: String(t.id), label: t.type_name })),
        },
        { key: 'provider_name', type: 'text', label: 'Provider name', placeholder: 'Dr. Smith',             required: false },
        { key: 'practice_name', type: 'text', label: 'Practice',      placeholder: 'Helena Family Medicine', required: false },
        { key: 'phone',         type: 'text', label: 'Phone',         placeholder: '(406) 555-1234',        required: false },
      ]}
      renderName={(item: ProviderRow) => {
        const typeName = providerTypes.find(t => t.id === item.provider_type_id)?.type_name;
        return (
          <>
            {item.provider_name ?? item.practice_name ?? 'Unnamed'}
            {item.practice_name && item.provider_name && (
              <span className="manage-item__meta">{item.practice_name}</span>
            )}
            {typeName && <span className="badge">{typeName}</span>}
          </>
        );
      }}
    />
  );
}