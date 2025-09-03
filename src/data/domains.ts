// src/data/domains.ts

export type DomainKey =
  | 'EVEIL_MUSICAL'
  | 'MUSICOTHERAPIE'
  | 'RELAXATIONS'
  | 'SPECTACLES'
  | 'ATELIER_EHPAD'
  | 'ATELIER_PE'
  | 'HANDPAN'
  | 'CONTACT_ONLY';

export type DomainField = {
  name: string;            // ← le "name" Netlify (visible + registry)
  label: string;           // label affiché
  type?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[];      // si select
};

export type DomainDef = {
  key: DomainKey;
  label: string;           // libellé dans le <select>
  fields: DomainField[];
};

export const DOMAINS: DomainDef[] = [
  {
    key: 'EVEIL_MUSICAL',
    label: 'Éveil musical',
    fields: [
      { name: 'Âge des enfants', label: 'Âge des enfants', type: 'text', required: true },
      { name: 'Nombre de participants', label: 'Nombre de participants', type: 'number', required: true },
      { name: 'Lieu', label: 'Lieu', type: 'text' },
      { name: 'Date souhaitée', label: 'Date souhaitée', type: 'date' },
    ],
  },
  {
    key: 'MUSICOTHERAPIE',
    label: 'Musicothérapie',
    fields: [
      { name: 'Public (pathologies, besoins)', label: 'Public (pathologies, besoins)', type: 'text', required: true },
      { name: 'Fréquence', label: 'Fréquence', type: 'text' },
      { name: 'Lieu', label: 'Lieu', type: 'text' },
    ],
  },
  {
    key: 'RELAXATIONS',
    label: 'Relaxations sonores',
    fields: [
      { name: 'Durée (mn)', label: 'Durée (mn)', type: 'number' },
      { name: 'Nombre de participants', label: 'Nombre de participants', type: 'number', required: true },
      { name: 'Lieu', label: 'Lieu', type: 'text' },
      { name: 'Date souhaitée', label: 'Date souhaitée', type: 'date' },
      { name: 'Objectif', label: 'Objectif (optionnel)', type: 'text' },
    ],
  },
  {
    key: 'SPECTACLES',
    label: 'Spectacles',
    fields: [
      { name: 'Type de spectacle', label: 'Type de spectacle', type: 'text', required: true },
      { name: 'Durée (mn)', label: 'Durée (mn)', type: 'number' },
      { name: 'Lieu', label: 'Lieu', type: 'text' },
      { name: 'Date souhaitée', label: 'Date souhaitée', type: 'date' },
    ],
  },
  {
    key: 'ATELIER_EHPAD',
    label: 'Atelier EHPAD',
    fields: [
      { name: 'Service / unité', label: 'Service / unité', type: 'text' },
      { name: 'Nombre de résidents', label: 'Nombre de résidents', type: 'number', required: true },
      { name: 'Fréquence', label: 'Fréquence', type: 'text' },
    ],
  },
  {
    key: 'ATELIER_PE',
    label: 'Atelier Petite Enfance',
    fields: [
      { name: 'Structure', label: 'Structure (crèche, RAM...)', type: 'text' },
      { name: 'Nombre d’enfants', label: 'Nombre d’enfants', type: 'number' },
      { name: 'Tranche d’âge', label: 'Tranche d’âge', type: 'text' },
    ],
  },
  {
    key: 'HANDPAN',
    label: 'Handpan',
    fields: [
      { name: 'Niveau', label: 'Niveau', type: 'text', required: true },
      { name: 'Objectif', label: 'Objectif', type: 'text' },
      { name: 'Durée souhaitée', label: 'Durée souhaitée', type: 'text' },
    ],
  },
  {
    key: 'CONTACT_ONLY',
    label: 'Me contacter uniquement',
    fields: [
      // Rien de plus : on garde Nom, Email, Message globaux
      // Tu peux en ajouter (ex: Sujet) si tu veux :
      // { name: 'Sujet', label: 'Sujet', type: 'text' }
    ],
  },
];

// Petit utilitaire pour récupérer un domaine à partir d’un label (provenant de l’URL ou du select)
export function findDomainByLabel(label: string | null | undefined): DomainDef | undefined {
  if (!label) return;
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return DOMAINS.find(d => norm(d.label) === norm(label));
}
