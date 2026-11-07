import type { Cefr, Theme, VocabEntry, VocabKind } from "@/lib/types";

export function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface Extra {
  syn?: string[];
  ant?: string[];
  col?: string[];
  us?: string;
  ukUs?: string;
}

/**
 * Constructeur compact d'entrées de vocabulaire pour un thème.
 * IPA : notation britannique (RP moderne) ; `us` si la prononciation
 * américaine diffère sensiblement.
 */
export function themeWords(theme: Theme) {
  return (
    word: string,
    kind: VocabKind,
    pos: string,
    ipa: string,
    level: Cefr,
    defEn: string,
    fr: string,
    example: string,
    extra: Extra = {},
  ): VocabEntry => ({
    id: slug(word),
    word,
    kind,
    pos,
    ipa,
    ipaUs: extra.us,
    level,
    theme,
    defEn,
    fr,
    example,
    synonyms: extra.syn,
    antonyms: extra.ant,
    collocations: extra.col,
    ukUs: extra.ukUs,
  });
}
