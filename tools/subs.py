# Builds WebVTT subtitles (es, en, pt) for the six films from their Spanish .srt files.
import re, os, sys
B = sys.argv[1]; OUT = os.path.join(B, 'demeter-web/assets/subs')
SRC = {'corporativo': 'demeter-corporativo/corporativo.srt', 'aliados': 'demeter-aliados/aliados.srt', 'del_suelo_a_tu_mesa': 'demeter-voxel/del_suelo_a_tu_mesa.srt',
       'nanomix': 'demeter-nanomix/nanomix.srt', 'nanoxtinger': 'demeter-nanoxtinger/nanoxtinger.srt', 'nanosteel': 'demeter-nanosteel/nanosteel.srt'}
T = {
"Nuestra misión: reducir el uso de agroquímicos en la agricultura.": ("Our mission: to reduce the use of agrochemicals in agriculture.", "Nossa missão: reduzir o uso de agroquímicos na agricultura."),
"Llevamos más de diez años investigando en formulaciones y en nanotecnología.": ("We have spent more than ten years researching formulations and nanotechnology.", "Há mais de dez anos pesquisamos formulações e nanotecnologia."),
"Por eso nuestra fórmula 10GW no tapa las boquillas como otros biológicos, no necesita refrigeración y es fácil de usar.": ("That is why our 10GW formula does not clog nozzles like other biologicals, needs no refrigeration and is easy to use.", "Por isso nossa fórmula 10GW não entope os bicos como outros biológicos, não precisa de refrigeração e é fácil de usar."),
"En nuestro laboratorio de tecnología de punta, un equipo capacitado cuida cada lote con alto control de calidad.": ("In our state-of-the-art laboratory, a trained team looks after every batch with strict quality control.", "Em nosso laboratório de tecnologia de ponta, uma equipe capacitada cuida de cada lote com alto controle de qualidade."),
"Investigamos fórmulas con más ingrediente activo, para reducir la dosis, sea preventiva o curativa.": ("We research formulas with more active ingredient, to lower the dose, whether preventive or curative.", "Pesquisamos fórmulas com mais ingrediente ativo, para reduzir a dose, seja preventiva ou curativa."),
"Buscamos nuevos microorganismos para nuevas mezclas y control de plagas, y nuevos geles para controlar bacterias.": ("We look for new microorganisms for new blends and pest control, and new gels to control bacteria.", "Buscamos novos microrganismos para novas misturas e controle de pragas, e novos géis para controlar bactérias."),
"Incluso estudiamos microorganismos que ayuden a degradar productos químicos.": ("We even study microorganisms that help break down chemical products.", "Estudamos até microrganismos que ajudem a degradar produtos químicos."),
"Demeter: ciencia para una agricultura con menos químicos.": ("Demeter: science for agriculture with fewer chemicals.", "Demeter: ciência para uma agricultura com menos químicos."),
"Tres productos, cinco aliados para tu cultivo.": ("Three products, five allies for your crop.", "Três produtos, cinco aliados para a sua lavoura."),
"NANO-STEEL controla nematodos. NANO-XTINGER, hongos que dañan la raíz. Y NANO-MIX, insectos plaga.": ("NANO-STEEL controls nematodes. NANO-XTINGER, fungi that damage the root. And NANO-MIX, insect pests.", "NANO-STEEL controla nematoides. NANO-XTINGER, fungos que danificam a raiz. E NANO-MIX, insetos-praga."),
"Sus esporas viajan protegidas en un gel hidrosoluble.": ("Their spores travel protected in a water-soluble gel.", "Seus esporos viajam protegidos em um gel hidrossolúvel."),
"Al tocar el agua, el gel se disuelve y las esporas se esparcen por el suelo.": ("On contact with water, the gel dissolves and the spores spread through the soil.", "Ao tocar a água, o gel se dissolve e os esporos se espalham pelo solo."),
"Riega temprano o al atardecer, sin sol directo, para que las esporas lleguen vivas.": ("Water early or at dusk, out of direct sun, so the spores arrive alive.", "Regue cedo ou ao entardecer, sem sol direto, para que os esporos cheguem vivos."),
"En la raíz viven en simbiosis con la planta: la fortalecen y la ayudan a crecer.": ("At the root they live in symbiosis with the plant: they strengthen it and help it grow.", "Na raiz vivem em simbiose com a planta: fortalecem-na e ajudam-na a crescer."),
"Y mejoran la vida del suelo: más microfauna, más equilibrio.": ("And they improve soil life: more microfauna, more balance.", "E melhoram a vida do solo: mais microfauna, mais equilíbrio."),
"Juntos se complementan: protegen el suelo, la raíz y la planta, de forma preventiva y curativa.": ("Together they complement each other: they protect the soil, the root and the plant, preventively and curatively.", "Juntos se complementam: protegem o solo, a raiz e a planta, de forma preventiva e curativa."),
"Demeter. Biocontrol orgánico certificado.": ("Demeter. Certified organic biocontrol.", "Demeter. Biocontrole orgânico certificado."),
"Todo empieza en el suelo de Centroamérica.": ("It all starts in the soil of Central America.", "Tudo começa no solo da América Central."),
"De Panamá, Nicaragua y Honduras vienen nuestras cepas nativas.": ("Our native strains come from Panama, Nicaragua and Honduras.", "Do Panamá, da Nicarágua e de Honduras vêm nossas cepas nativas."),
"Tenemos programas para arroz, maní, café, tomate y tabaco.": ("We have programmes for rice, peanut, coffee, tomato and tobacco.", "Temos programas para arroz, amendoim, café, tomate e tabaco."),
"En arroz, el programa empieza desde la semilla.": ("In rice, the programme starts from the seed.", "No arroz, o programa começa desde a semente."),
"Y durante el ciclo, cero días de residual.": ("And throughout the cycle, zero days of residue.", "E durante o ciclo, zero dias de residual."),
"Nuestras certificaciones orgánicas para Europa, Estados Unidos y Japón ayudan a que tu cosecha llegue a esos mercados.": ("Our organic certifications for Europe, the United States and Japan help your harvest reach those markets.", "Nossas certificações orgânicas para a Europa, os Estados Unidos e o Japão ajudam sua colheita a chegar a esses mercados."),
"Y nuestros distribuidores llegan a Latinoamérica y el Caribe.": ("And our distributors reach Latin America and the Caribbean.", "E nossos distribuidores chegam à América Latina e ao Caribe."),
"Demeter: del suelo a tu mesa.": ("Demeter: from the soil to your table.", "Demeter: do solo à sua mesa."),
"Y también acompañamos caña, maíz, hortalizas y frutales.": ("We also support sugar cane, maize, vegetables and fruit trees.", "E também acompanhamos cana, milho, hortaliças e frutíferas."),
"Una plaga está atacando tu cultivo.": ("A pest is attacking your crop.", "Uma praga está atacando a sua lavoura."),
"Pero no estás solo: llegan dos hongos benéficos.": ("But you are not alone: two beneficial fungi arrive.", "Mas você não está sozinho: chegam dois fungos benéficos."),
"Sus esporas se adhieren al insecto, germinan y lo controlan desde dentro.": ("Their spores stick to the insect, germinate and control it from within.", "Seus esporos aderem ao inseto, germinam e o controlam por dentro."),
"Y no se detienen: esporulando sobre la plaga, se multiplican.": ("And they do not stop: sporulating on the pest, they multiply.", "E não param: esporulando sobre a praga, eles se multiplicam."),
"Si lo aplicas de forma preventiva, proteges tu cultivo antes de que llegue la plaga.": ("Applied preventively, it protects your crop before the pest arrives.", "Aplicado de forma preventiva, protege a sua lavoura antes que a praga chegue."),
"Juntos forman NANO-MIX 10GW, un insecticida microbiológico.": ("Together they make NANO-MIX 10GW, a microbial insecticide.", "Juntos formam o NANO-MIX 10GW, um inseticida microbiológico."),
"Su secreto: un gel hidrosoluble que protege las esporas hasta por dos años.": ("Its secret: a water-soluble gel that protects the spores for up to two years.", "Seu segredo: um gel hidrossolúvel que protege os esporos por até dois anos."),
"En otras formulaciones, las esporas se van al fondo, quedan suspendidas o se compactan.": ("In other formulations, the spores sink to the bottom, stay suspended or compact.", "Em outras formulações, os esporos vão para o fundo, ficam suspensos ou se compactam."),
"Con NANO-MIX, se mantienen en todo el envase: cada dosis lleva lo mismo.": ("With NANO-MIX, they stay throughout the container: every dose carries the same.", "Com o NANO-MIX, eles se mantêm em toda a embalagem: cada dose leva o mesmo."),
"Fácil de aplicar, cero días de residual y sin generar resistencia.": ("Easy to apply, zero days of residue and no resistance build-up.", "Fácil de aplicar, zero dias de residual e sem gerar resistência."),
"NANO-MIX, de Demeter. Orgánico certificado.": ("NANO-MIX, by Demeter. Certified organic.", "NANO-MIX, da Demeter. Orgânico certificado."),
"Bajo tierra, un hongo dañino ataca la raíz de tu cultivo.": ("Underground, a harmful fungus attacks your crop's root.", "Debaixo da terra, um fungo nocivo ataca a raiz da sua lavoura."),
"Pero llegan dos aliados: hongos benéficos que defienden la raíz.": ("But two allies arrive: beneficial fungi that defend the root.", "Mas chegam dois aliados: fungos benéficos que defendem a raiz."),
"Colonizan la raíz, le quitan espacio y alimento al patógeno y lo controlan.": ("They colonise the root, take space and food from the pathogen, and control it.", "Colonizam a raiz, tiram espaço e alimento do patógeno e o controlam."),
"Y no solo cuando ya hay plaga: aplicado antes, protege la raíz de forma preventiva.": ("And not only once the problem is there: applied earlier, it protects the root preventively.", "E não só quando a praga já existe: aplicado antes, protege a raiz de forma preventiva."),
"Juntos forman NANO-XTINGER 10GW, un fungicida microbiológico.": ("Together they make NANO-XTINGER 10GW, a microbial fungicide.", "Juntos formam o NANO-XTINGER 10GW, um fungicida microbiológico."),
"Con NANO-XTINGER, se mantienen en todo el envase: cada dosis lleva lo mismo.": ("With NANO-XTINGER, they stay throughout the container: every dose carries the same.", "Com o NANO-XTINGER, eles se mantêm em toda a embalagem: cada dose leva o mesmo."),
"NANO-XTINGER, de Demeter. Orgánico certificado.": ("NANO-XTINGER, by Demeter. Certified organic.", "NANO-XTINGER, da Demeter. Orgânico certificado."),
"Bajo tierra, los nematodos atacan la raíz de tu cultivo.": ("Underground, nematodes attack your crop's root.", "Debaixo da terra, os nematoides atacam a raiz da sua lavoura."),
"Pero llega un aliado: un hongo benéfico que caza nematodos.": ("But an ally arrives: a beneficial fungus that hunts nematodes.", "Mas chega um aliado: um fungo benéfico que caça nematoides."),
"Sus esporas infectan los huevos y las hembras del nematodo, y lo controlan desde dentro.": ("Its spores infect the nematode's eggs and females, and control it from within.", "Seus esporos infectam os ovos e as fêmeas do nematoide, e o controlam por dentro."),
"Es curativo: actúa cuando la plaga ya está en la raíz.": ("It is curative: it acts when the pest is already at the root.", "É curativo: age quando a praga já está na raiz."),
"Y es preventivo: aplicado antes, protege la raíz antes de que llegue la plaga.": ("And it is preventive: applied earlier, it protects the root before the pest arrives.", "E é preventivo: aplicado antes, protege a raiz antes que a praga chegue."),
"Así es NANO-STEEL 10GW, un nematicida microbiológico.": ("This is NANO-STEEL 10GW, a microbial nematicide.", "Assim é o NANO-STEEL 10GW, um nematicida microbiológico."),
"Con NANO-STEEL, se mantienen en todo el envase: cada dosis lleva lo mismo.": ("With NANO-STEEL, they stay throughout the container: every dose carries the same.", "Com o NANO-STEEL, eles se mantêm em toda a embalagem: cada dose leva o mesmo."),
"NANO-STEEL, de Demeter. Orgánico certificado.": ("NANO-STEEL, by Demeter. Certified organic.", "NANO-STEEL, da Demeter. Orgânico certificado."),
}
os.makedirs(OUT, exist_ok=True); miss = 0
for name, rel in SRC.items():
    blocks = re.split(r'\n\s*\n', open(os.path.join(B, rel), encoding='utf-8').read().strip())
    out = {'es': ['WEBVTT', ''], 'en': ['WEBVTT', ''], 'pt': ['WEBVTT', '']}
    for b in blocks:
        ls = b.strip().split('\n'); tm = ls[1].replace(',', '.'); txt = ' '.join(ls[2:]).strip()
        if txt not in T: print('MISSING', name, txt); miss += 1; continue
        for lang, s in (('es', txt), ('en', T[txt][0]), ('pt', T[txt][1])): out[lang] += [tm + ' line:92% size:92%', s, '']
    for lang in out: open(os.path.join(OUT, f'{name}.{lang}.vtt'), 'w', encoding='utf-8').write('\n'.join(out[lang]))
print('missing', miss); sys.exit(1 if miss else 0)
