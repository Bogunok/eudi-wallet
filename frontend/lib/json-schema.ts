import type { JsonSchemaStructure, JsonSchemaProperty } from './vc-types';

// TODO : array, object, enum.
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'unsupported';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  description?: string;
  unsupportedReason?: string;
}

export function parseSchemaFields(structure: JsonSchemaStructure | undefined): FormField[] {
  if (!structure || !structure.properties) return [];

  const required = new Set(structure.required ?? []);
  const fields: FormField[] = [];

  for (const [name, prop] of Object.entries(structure.properties)) {
    fields.push(propertyToField(name, prop, required.has(name)));
  }

  return fields;
}

function propertyToField(name: string, prop: JsonSchemaProperty, isRequired: boolean): FormField {
  const base = {
    name,
    label: humanize(name),
    required: isRequired,
    description: prop.description,
  };

  // 'date' → date input
  if (prop.type === 'string' && prop.format === 'date') {
    return { ...base, type: 'date' };
  }

  if (prop.type === 'string') {
    return {
      ...base,
      type: 'text',
      minLength: prop.minLength,
      maxLength: prop.maxLength,
    };
  }

  // number / integer
  if (prop.type === 'number' || prop.type === 'integer') {
    return {
      ...base,
      type: 'number',
      min: prop.minimum,
      max: prop.maximum,
    };
  }

  return {
    ...base,
    type: 'unsupported',
    unsupportedReason: `Field type "${prop.type ?? 'unknown'}" is not supported in this UI yet.`,
  };
}

function humanize(name: string): string {
  const words = name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/);

  return words
    .map(word => {
      if (word.length <= 4 && /^[a-z]+$/.test(word) && KNOWN_ACRONYMS.has(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

const KNOWN_ACRONYMS = new Set([
  'lei',
  'id',
  'url',
  'jwt',
  'did',
  'vc',
  'iso',
  'eu',
  'us',
  'uk',
  'pin',
]);
