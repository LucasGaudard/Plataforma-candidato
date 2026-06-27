export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export type BrazilianState = typeof BRAZILIAN_STATES[number];

export const CITIES_BY_STATE: Record<string, string[]> = {
  'AC': [], 'AL': [], 'AP': [], 'AM': [], 'BA': [], 'CE': [], 'DF': [], 'ES': [], 'GO': [], 'MA': [],
  'MT': [], 'MS': [], 'MG': [], 'PA': [], 'PB': [], 'PR': [], 'PE': [], 'PI': [],
  'RJ': [
    'Angra dos Reis', 'Aperibé', 'Araruama', 'Areal', 'Armação dos Búzios',
    'Arraial do Cabo', 'Barra do Piraí', 'Barra Mansa', 'Belford Roxo',
    'Bom Jardim', 'Bom Jesus do Itabapoana', 'Cabo Frio', 'Cachoeiras de Macacu',
    'Cambuci', 'Campos dos Goytacazes', 'Cantagalo', 'Carapebus', 'Cardoso Moreira',
    'Carmo', 'Casimiro de Abreu', 'Comendador Levy Gasparian', 'Conceição de Macabu',
    'Cordeiro', 'Duas Barras', 'Duque de Caxias', 'Engenheiro Paulo de Frontin',
    'Guapimirim', 'Iguaba Grande', 'Itaboraí', 'Itaguaí', 'Italva', 'Itaocara',
    'Itaperuna', 'Itatiaia', 'Japeri', 'Laje do Muriaé', 'Macaé', 'Macuco',
    'Magé', 'Mangaratiba', 'Maricá', 'Mendes', 'Mesquita', 'Miguel Pereira',
    'Miracema', 'Natividade', 'Nilópolis', 'Niterói', 'Nova Friburgo',
    'Nova Iguaçu', 'Paracambi', 'Paraíba do Sul', 'Paraty', 'Paty do Alferes',
    'Petrópolis', 'Pinheiral', 'Piraí', 'Porciúncula', 'Porto Real',
    'Quatis', 'Queimados', 'Quissamã', 'Resende', 'Rio Bonito', 'Rio Claro',
    'Rio das Flores', 'Rio das Ostras', 'Rio de Janeiro', 'Santa Maria Madalena',
    'Santo Antônio de Pádua', 'São Fidélis', 'São Francisco de Itabapoana',
    'São Gonçalo', 'São João da Barra', 'São João de Meriti',
    'São José de Ubá', 'São José do Vale do Rio Preto', 'São Pedro da Aldeia',
    'São Sebastião do Alto', 'Sapucaia', 'Saquarema', 'Seropédica',
    'Silva Jardim', 'Sumidouro', 'Tanguá', 'Teresópolis', 'Trajano de Moraes',
    'Três Rios', 'Valença', 'Varre-Sai', 'Vassouras', 'Volta Redonda'
  ],
  'RN': [], 'RS': [], 'RO': [], 'RR': [], 'SC': [], 'SP': [], 'SE': [], 'TO': [],
};

// Bairros/Regiões por cidade (Rio de Janeiro com lista completa; demais cidades com lista base)
const RJ_DEFAULT_NEIGHBORHOODS = ['Centro', 'Outro'];

export const NEIGHBORHOODS_BY_CITY: Record<string, string[]> = {
  'Rio de Janeiro': [
    'Bangu', 'Barra da Tijuca', 'Botafogo', 'Campo Grande', 'Centro',
    'Cidade de Deus', 'Copacabana', 'Deodoro', 'Flamengo', 'Grajaú',
    'Guaratiba', 'Ipanema', 'Jacarepaguá', 'Lapa', 'Leblon',
    'Madureira', 'Méier', 'Paciência', 'Padre Miguel', 'Penha',
    'Piedade', 'Realengo', 'Recreio dos Bandeirantes', 'Riachuelo',
    'Santa Cruz', 'Santíssimo', 'São Cristóvão', 'Sepetiba',
    'Tijuca', 'Vila Isabel', 'Outro',
  ],
  'Belford Roxo': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Duque de Caxias': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Guapimirim': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Itaboraí': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Japeri': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Magé': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Mesquita': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Nilópolis': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Niterói': ['Barreto', 'Centro', 'Fonseca', 'Icaraí', 'Ingá', 'Pendotiba', 'Santa Rosa', 'São Francisco', 'Outro'],
  'Nova Iguaçu': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Paracambi': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Queimados': [...RJ_DEFAULT_NEIGHBORHOODS],
  'São Gonçalo': ['Alcântara', 'Arsenal', 'Centro', 'Neves', 'Porto Velho', 'Rocha', 'Outro'],
  'São João de Meriti': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Seropédica': [...RJ_DEFAULT_NEIGHBORHOODS],
  'Tanguá': [...RJ_DEFAULT_NEIGHBORHOODS],
};
