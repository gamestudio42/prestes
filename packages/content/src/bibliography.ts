/**
 * The bibliography printed at the end of the compendium book
 * (complete-books-and-bibliography D5). One row per registered source; the book
 * prints the rows of the sources a chapter, an entry, a quotation or a caption
 * cites. References are identical in every locale; tier, rights and status
 * labels are localized. Mirrors docs/history/SOURCES.md; the content check
 * compares each row's title with the key's paragraph there.
 */
import type { SourceKey } from './sources';

export type SourceTier = 0 | 1 | 2 | 3 | 4;

export interface BibliographyRow {
  /** Short form printed on source lines: "Macaulay 1974". */
  short: string;
  /** Author, title, edition, place, publisher, year. */
  reference: string;
  /** A distinctive part of the title, which SOURCES.md must contain on the key's paragraph. */
  title: string;
  tier: SourceTier;
}

export const BIBLIOGRAPHY: Readonly<Record<SourceKey, BibliographyRow>> = {
  'macaulay-1974': {
    short: 'Macaulay 1974',
    reference: 'MACAULAY, Neill. The Prestes Column: Revolution in Brazil. New York: New Viewpoints / Franklin Watts, 1974.',
    title: 'The Prestes Column: Revolution in Brazil',
    tier: 0,
  },
  'blanc-2024': {
    short: 'Blanc 2024',
    reference:
      'BLANC, Jacob. The Prestes Column: An Interior History of Modern Brazil. Durham: Duke University Press, 2024 (open access, CC BY-NC 4.0). Ed. bras.: A Coluna Prestes: uma história do interior. São Paulo: UNESP, 2024.',
    title: 'The Prestes Column: An Interior History of Modern Brazil',
    tier: 1,
  },
  'amado-1942': {
    short: 'Amado 1942',
    reference: 'AMADO, Jorge. O cavaleiro da esperança: vida de Luiz Carlos Prestes (1942). 32. ed. Rio de Janeiro: Record, 1985.',
    title: 'O Cavaleiro da Esperança',
    tier: 1,
  },
  'lima-1931': {
    short: 'Moreira Lima 1931',
    reference:
      'LIMA, Lourenço Moreira. Marchas e combates: a Columna invicta e a Revolução de Outubro. Pelotas: Livraria do Globo, 1931. 3. ed.: A Coluna Prestes (marchas e combates). São Paulo: Alfa-Ômega, 1979.',
    title: 'Marchas e combates',
    tier: 2,
  },
  'joao-alberto-1954': {
    short: 'João Alberto 1954',
    reference: 'BARROS, João Alberto Lins de. Memórias de um revolucionário. Rio de Janeiro: Civilização Brasileira, 1954.',
    title: 'Memórias de um',
    tier: 2,
  },
  'tavora-1928': {
    short: 'Távora 1928',
    reference: 'TÁVORA, Juarez. À guisa de depoimento sobre a Revolução Brasileira de 1924. São Paulo: O Combate, 1928.',
    title: 'À guisa de depoimento',
    tier: 2,
  },
  'anita-1991': {
    short: 'A. Prestes 1991',
    reference: 'PRESTES, Anita Leocádia. A Coluna Prestes. 3. ed. São Paulo: Brasiliense, 1991.',
    title: 'A Coluna Prestes_ (3rd ed.',
    tier: 3,
  },
  'anita-1995': {
    short: 'A. Prestes 1995',
    reference: 'PRESTES, Anita Leocádia. Uma epopéia brasileira: a Coluna Prestes. São Paulo: Moderna, 1995 (Coleção Polêmica).',
    title: 'Uma epopéia brasileira',
    tier: 3,
  },
  'helio-1922': {
    short: 'Silva 1971a',
    reference: 'SILVA, Hélio. 1922: sangue na areia de Copacabana. 2. ed. Rio de Janeiro: Civilização Brasileira, 1971.',
    title: 'sangue na areia de Copacabana',
    tier: 3,
  },
  'helio-1926': {
    short: 'Silva 1971b',
    reference: 'SILVA, Hélio. 1926: a grande marcha. 2. ed. Rio de Janeiro: Civilização Brasileira, 1971.',
    title: 'a grande marcha',
    tier: 3,
  },
  'meirelles-1995': {
    short: 'Meirelles 1995',
    reference: 'MEIRELLES, Domingos. As noites das grandes fogueiras: uma história da Coluna Prestes. 2. ed. Rio de Janeiro: Record, 1995.',
    title: 'As noites das grandes fogueiras',
    tier: 3,
  },
  'brum-1994': {
    short: 'Brum 1994',
    reference: 'BRUM, Eliane. Coluna Prestes: o avesso da lenda. Porto Alegre: Artes e Ofícios, 1994.',
    title: 'o avesso da lenda',
    tier: 3,
  },
  'castro-2016': {
    short: 'Castro 2016',
    reference: 'CASTRO, Maria Clara Spada de. Além da marcha: a (re)formação da Coluna Miguel Costa–Prestes. Dissertação (Mestrado), UNIFESP, 2016.',
    title: 'Além da marcha',
    tier: 3,
  },
  'castro-2022': {
    short: 'Castro 2022',
    reference: 'CASTRO, Maria Clara Spada de. A revolta de 1924 em São Paulo: para além dos tenentes. Tese (Doutorado), UFRRJ, 2022.',
    title: 'A revolta de 1924 em São Paulo',
    tier: 3,
  },
  'cohen-2007': {
    short: 'Cohen 2007',
    reference: 'COHEN, Ilka Stern. Bombas sobre São Paulo: a revolução de 1924. São Paulo: UNESP, 2007.',
    title: 'Bombas sobre São Paulo',
    tier: 3,
  },
  'campoi-2001': {
    short: 'Campoi 2001',
    reference: 'CAMPOI, Isabela Candeloro. A Coluna Prestes: práticas cotidianas em uma guerra de movimento (1924–1927). Dissertação (Mestrado), UNESP, 2001.',
    title: 'práticas',
    tier: 3,
  },
  'carvalho-2001': {
    short: 'Carvalho 2001',
    reference: 'CARVALHO, Maria Meire de. A invenção das vivandeiras: mulheres na marcha da Coluna Prestes. Dissertação (Mestrado), UFG, 2001.',
    title: 'A invenção das vivandeiras',
    tier: 3,
  },
  'tecchio-2021': {
    short: 'Tecchio 2021',
    reference: 'TECCHIO, Caroline. A Coluna da Morte: memórias, representações e a escrita de si do tenente João Cabanas (1924–1928). Tese (Doutorado), UNIOESTE, 2021.',
    title: 'A Coluna da Morte',
    tier: 3,
  },
  'silva-2022': {
    short: 'H. R. Silva 2022',
    reference: 'SILVA, Helissandro Rocha da. Travessias pelos sertões do nordeste: uma guerra chamada cangaço entrementes a Coluna Prestes (1920–1928). Dissertação (Mestrado), UFPI, 2022.',
    title: 'Travessias pelos sertões do',
    tier: 3,
  },
  'vitor-2011': {
    short: 'Vitor 2011',
    reference: 'VITOR, Amilcar Guidolim. A Coluna Prestes em Santo Ângelo/RS. Dissertação (Mestrado), UFSM, 2011.',
    title: 'A Coluna Prestes em Santo Ângelo/RS',
    tier: 3,
  },
  'xavier-2011': {
    short: 'Xavier 2011',
    reference: 'XAVIER, Mateus Fernandez. A Coluna Prestes e a política externa brasileira na década de 1920. Dissertação (Mestrado), UnB, 2011.',
    title: 'A Coluna Prestes e a política',
    tier: 3,
  },
  'teles-2008': {
    short: 'Teles 2008',
    reference: 'TELES, José Mendonça. A Coluna Prestes em Goiás. Goiânia: Kelps, 2008.',
    title: 'A Coluna Prestes em Goiás',
    tier: 3,
  },
  'castro-chico-2008': {
    short: 'C. Castro 2008',
    reference: 'CASTRO, Chico. A Coluna Prestes no Piauí. 2. ed. Brasília: Senado Federal, 2008.',
    title: 'A Coluna Prestes no Piauí',
    tier: 3,
  },
  'ferreira-1980': {
    short: 'Ferreira 1980',
    reference: 'FERREIRA, Lúcia de Fátima Guerra. A Coluna Prestes e a Paraíba. João Pessoa: Ed. Universitária, 1980.',
    title: 'A Coluna Prestes e a',
    tier: 3,
  },
  'otaviano-1979': {
    short: 'Otaviano 1979',
    reference: 'OTAVIANO, Manuel. A Coluna Prestes na Paraíba: os mártires de Piancó. João Pessoa: Acauã, 1979.',
    title: 'os mártires',
    tier: 3,
  },
  'bandeira-2013': {
    short: 'Bandeira 2013',
    reference: 'BANDEIRA, Renato Luís. A Coluna Prestes na Bahia: trilhas, combates e desafios. Salvador: Edição do Autor, 2013.',
    title: 'A Coluna Prestes na Bahia',
    tier: 3,
  },
  'nascimento-2026': {
    short: 'Nascimento 2026',
    reference: 'NASCIMENTO, Levon (org.). A Coluna Prestes pelos Gerais de Minas. 2026.',
    title: 'A Coluna Prestes pelos Gerais de',
    tier: 3,
  },
  'almg-2026': {
    short: 'ALMG 2026',
    reference: 'ASSEMBLEIA LEGISLATIVA DE MINAS GERAIS. Obra sobre a Coluna Prestes no Norte de Minas é lançada na ALMG. 10 abr. 2026. Disponível em: almg.gov.br.',
    title: 'Obra sobre a Coluna',
    tier: 4,
  },
  'fapesp-2007': {
    short: 'Gonçalo Junior 2007',
    reference: 'GONÇALO JUNIOR. A revolução que São Paulo esqueceu. Pesquisa FAPESP, n. 135, maio 2007.',
    title: 'A revolução que São Paulo esqueceu',
    tier: 4,
  },
  'revolucao-cultural-2025': {
    short: 'Revolução Cultural 2025',
    reference: 'REVOLUÇÃO CULTURAL. SC: cidade de Descanso comemora os 100 anos da passagem da Coluna Prestes por suas terras. 2025. Disponível em: revolucaocultural.com.br.',
    title: 'cidade de Descanso',
    tier: 4,
  },
  'cpdoc-coluna': {
    short: 'CPDOC, "Coluna Prestes"',
    reference: 'CPDOC/FGV. Coluna Prestes. Verbete, Dicionário da Primeira República. Disponível em: cpdoc.fgv.br. Acesso em: 6 nov. 2026.',
    title: '"Coluna Prestes", verbete',
    tier: 3,
  },
  'cpdoc-prestes': {
    short: 'CPDOC, "Luis Carlos Prestes"',
    reference: 'CPDOC/FGV. Luis Carlos Prestes. Verbete, Atlas Histórico do Brasil. Disponível em: atlas.fgv.br. Acesso em: 6 nov. 2026.',
    title: '"Luis Carlos Prestes", Atlas',
    tier: 3,
  },
  'mvcp-portal': {
    short: 'Memorial Virtual Coluna Prestes',
    reference: 'MEMORIAL VIRTUAL COLUNA PRESTES (UFU). Portal Anticolonialismo. Disponível em: anticolonialismo.org/coluna-prestes. Acesso em: 30 out. 2026.',
    title: 'Memorial Virtual Coluna Prestes',
    tier: 4,
  },
  'manifesto-1925': {
    short: 'Manifesto 1925',
    reference:
      'COSTA, Miguel; PRESTES, Luís Carlos; TÁVORA, Juarez. Manifesto da Coluna Prestes. Porto Nacional, 19 out. 1925. Transcrição: Marxists Internet Archive (GNU FDL).',
    title: 'Manifesto da Coluna Prestes',
    tier: 2,
  },
  'libertador-1924': {
    short: 'O Libertador 1924',
    reference: 'O LIBERTADOR. Boletim da Coluna. São Luiz Gonzaga (RS) e ao longo da marcha, 1924–1926.',
    title: '_O Libertador_, the column',
    tier: 2,
  },
  'mozzer-2009': {
    short: 'Mozzer 2009',
    reference: 'MOZZER, Marcelo Luiz Cesar. Presença da Coluna Prestes nas veredas do Grande sertão. Contexto (Ufes), n. 15/16, p. 246–259, 2008/2009.',
    title: 'Presença da Coluna Prestes nas',
    tier: 3,
  },
  'rosa-1956': {
    short: 'Rosa 1956',
    reference: 'ROSA, João Guimarães. Grande sertão: veredas (1956). 36. ed. Rio de Janeiro: Nova Fronteira, 1986.',
    title: 'Grande sertão: veredas',
    tier: 3,
  },
  'starling-1999': {
    short: 'Starling 1999',
    reference:
      'STARLING, Heloísa Maria Murgel. Lembranças do Brasil: teoria política, história e ficção em Grande sertão: veredas. Rio de Janeiro: Revan / UCAM / IUPERJ, 1999.',
    title: 'Lembranças do Brasil',
    tier: 3,
  },
  'historiafm-2024': {
    short: 'História FM 2024',
    reference:
      'RODRIGUES, Icles (apres.); VITOR, Amilcar Guidolim. Coluna Prestes: a maior marcha militar da história. História FM, ep. 190, 15 dez. 2024 (podcast).',
    title: 'a maior marcha militar da história',
    tier: 3,
  },
  'superoitocine-2012': {
    short: 'Superoitocine 2012',
    reference: 'SUPEROITOCINE. Coluna Prestes | DOC. YouTube, 16 nov. 2012 (não consultado).',
    title: 'Coluna Prestes | DOC',
    tier: 4,
  },
};

/** Short form of a source key for source lines; the key itself if unknown. */
export function sourceShort(key: string): string {
  return (BIBLIOGRAPHY as Record<string, BibliographyRow | undefined>)[key]?.short ?? key;
}

/** Compares each row's title with the key's paragraph in SOURCES.md. */
export function validateBibliography(sourcesMarkdown: string, cited: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const text = sourcesMarkdown.replace(/\s+/g, ' ');
  for (const key of cited) {
    const row = (BIBLIOGRAPHY as Record<string, BibliographyRow | undefined>)[key];
    if (!row) {
      errors.push(`cited source ${key} has no bibliography row`);
      continue;
    }
    const at = text.indexOf(`\`${key}\` —`);
    const paragraph = at < 0 ? '' : text.slice(at, at + 900);
    if (!paragraph.includes(row.title.replace(/\s+/g, ' '))) {
      errors.push(`bibliography row ${key}: title "${row.title}" not found by its key in SOURCES.md`);
    }
  }
  return errors;
}
