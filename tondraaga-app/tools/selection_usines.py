"""Sélection des produits d'usine (AliExpress, juin-novembre 2026) pour les rayons importés de Tondraaga.
Entrée : la liste brute des recherches (ali.json) ; sortie : web/produits/import-usines.json (nom et texte en français,
prix fournisseur en euros, photo et lien d'origine). Les véhicules (sauf pièces) sont « sur devis » : pas de prix."""
import json
import sys

S = {
 'electro-mobilite': [
  (14, 'Vélo électrique Urlife E20 à gros pneus 20 pouces', 'Moteur 250 W, batterie amovible 48 V 13 Ah, jusqu’à 80 km d’autonomie, 25 km/h.'),
  (15, 'Vélo électrique HillMiles MileCity 1, cadre bas 26 pouces', 'Moteur 250 W, batterie 36 V 13 Ah, jusqu’à 120 km d’autonomie : idéal pour la ville.'),
  (16, 'Vélo électrique pliable DEEPOWER G23, 1 500 W', 'Batterie amovible 48 V, gros pneus pour la ville et les pistes.'),
  (18, 'Vélo électrique pliable 14 pouces, 250 W', 'Batterie amovible 48 V 7,5 Ah, charge rapide, jusqu’à 40 km d’autonomie.'),
  (21, 'Vélo électrique pliable HillMiles MilePort 20 pouces', 'Pneus larges 20 × 3, moteur 250 W, batterie 36 V 13 Ah, jusqu’à 120 km.'),
  (25, 'Vélo électrique HEADEER BK1350, 26 pouces, 500 W', 'Batterie 48 V 15 Ah, vitesse maximale 35 km/h, pneus de 26 pouces.'),
  ('vehicules-motos+', 18, 'Scooter électrique Y18, 2 000 W', 'Batterie 48 V 20 Ah, jusqu’à 55 km/h et 80 à 90 km d’autonomie.'),
  ('vehicules-motos+', 17, 'Trottinette électrique JOYOR T10, double moteur 2 000 W', 'Batterie 60 V 18 Ah, freins hydrauliques, pour adultes.'),
  ('vehicules-motos+', 23, 'Trottinette électrique W8, 750 W', 'Double suspension, batterie 48 V 14 Ah, pneus de 9,3 pouces.'),
 ],
 'electro-cuisine': [
  (3, 'Mixeur 2-en-1, 2 000 W', 'Blender et robot culinaire : jus, smoothies, glace pilée et préparations.'),
  (5, 'Blender et robot culinaire 2 L, 2 000 W', 'Bol de 2 L, lames en acier inoxydable qui écrasent la glace.'),
  (0, 'Blender professionnel haute puissance', 'Bol sans BPA, pour jus, smoothies glacés et cuisine en usage intensif.'),
  (26, 'Blender BioloMix 3 HP, 2 200 W, avec minuteur', 'Moteur puissant et minuterie, pour fruits, légumes et glace.'),
  (13, 'Blender 2-en-1 grande capacité 2,9 L, 2 000 W', 'Bol de 2,9 L sans BPA, base antidérapante, broie la glace.'),
  (27, 'Machine à lait de soja et blender 1,5 L', 'Prépare lait de soja, jus et bouillies ; broie les céréales.'),
  (6, 'Blender commercial 2 000 W (220 V)', 'Pour jus de fruits, glace et smoothies en boutique ou en maquis.'),
  (14, 'Blender portable rechargeable 700 ml', 'Mixeur nomade rechargeable par USB, pour jus et milk-shakes.'),
 ],
 'electro-moulins': [
  (27, 'Broyeur à farine 2 500 g (110/220 V)', 'Moud céréales, épices et herbes sèches en poudre fine ; maison ou commerce.'),
  (12, 'Broyeur à grains oscillant SucceBuy, 150 à 2 500 g', 'Moulin électrique pour grains, épices et herbes sèches.'),
  (22, 'Broyeur électrique grande vitesse 1 000 g', 'Pour grains, café, épices et poudres.'),
  (20, 'Broyeur grande capacité 800 g, 3 000 W', 'Moulin à grains, herbes et épices.'),
  (24, 'Moulin BioloMix 700 g', 'Céréales, épices, café et aliments secs.'),
  (9, 'Moulin à grains inox 300 W', 'Huit lames, pour café, arachides, noix et herbes séchées.'),
  (23, 'Moulin à grains manuel en fonte', 'Moulin à manivelle avec entonnoir de 14 cm, mouture réglable, pour maïs et céréales.'),
  (8, 'Broyeur multifonction café, céréales et épices', 'Petit moulin électrique pour la cuisine.'),
 ],
 'electro-snack': [
  (0, 'Machine à popcorn avec chariot SucceBuy', 'Bouilloire de 8 oz, 48 tasses par fournée, vitres en verre trempé.'),
  (2, 'Machine à popcorn de comptoir, 850 W', 'Bouilloire de 8 oz, 48 tasses par fournée : pour boutiques, écoles et fêtes.'),
  (8, 'Machine à popcorn à air chaud, 1 200 W', 'Popcorn sans huile, facile à nettoyer.'),
  (14, 'Machine à barbe à papa avec chariot', 'Machine commerciale avec bol en acier inoxydable.'),
  (16, 'Machine à barbe à papa commerciale, 1 000 W', 'Bol en acier inoxydable, facile à utiliser.'),
  (28, 'Friteuse électrique commerciale double bac 20 L, 3 000 W', 'Deux bacs, vannes de vidange et minuterie : poulet, frites, alloco.'),
  (33, 'Friteuse électrique commerciale 12 L, double cuve', 'Acier inoxydable, filtration de l’huile.'),
  (40, 'Friteuse à gaz professionnelle 8 L', 'Cuve en acier inoxydable, thermostat réglable.'),
 ],
 'electro-froid': [
  (5, 'Réfrigérateur à boissons à porte vitrée (126 canettes)', 'Vitrine réfrigérée pour boutique, étagères réglables.'),
  (0, 'Réfrigérateur-congélateur portable Foursun, 21 à 55 L', 'Compresseur 12/24 V et 220 V, réglage par application.'),
  (2, 'Mini-frigo à compresseur VEVOR, 30 à 50 L', 'Fonctionne sur 12/24 V et 220 V : maison, voiture, boutique.'),
  (4, 'Réfrigérateur-congélateur Alpicool, 25 à 45 L', 'Compresseur 12/24 V et 100-240 V.'),
  (17, 'Ventilateur sur pied 3-en-1, 5 vitesses', 'Quatre hauteurs, silencieux.'),
  (22, 'Ventilateur sur pied rechargeable avec télécommande', 'Batterie intégrée : continue de tourner pendant les délestages.'),
  (18, 'Ventilateur rechargeable pliable 6 000 mAh', 'Sans fil, télécommande, silencieux.'),
  (24, 'Ventilateur pliable P10, batterie 10 800 mAh', 'Sans fil et rechargeable, télécommande.'),
 ],
 'electro-maison': [
  (6, 'Bouilloire électrique en verre 1,7 L', 'Réglage de la température, maintien au chaud, base rotative.'),
  (7, 'Bouilloire en verre DEVISIB, 2 200 W', 'Ébullition rapide, réglage de la température.'),
  (11, 'Bouilloire électrique Joyoung 1,5 L', 'Multifonction : eau, thé, tisanes, soupes.'),
  (1, 'Bouilloire col de cygne 1 000 W, inox', 'Affichage LED, idéale pour le thé et le café.'),
  (19, 'Fer à repasser à station vapeur 3 100 W', '8 bars, 600 g/min de vapeur, anti-calcaire et anti-goutte.'),
  (17, 'Défroisseur vapeur portable 1 500 W', 'Chauffe rapide, réservoir de 280 ml.'),
  (14, 'Défroisseur vapeur MIJIA 2', 'Pliable et portable, pour défroisser sans planche.'),
  (25, 'Fer à vapeur portable 2-en-1', 'Repassage à la vapeur et à sec, idéal en voyage.'),
 ],
 'electro-image-son': [
  (1, 'Téléviseur Xiaomi S Mini LED 55 pouces', 'Google TV, 144 Hz, Dolby Vision et Dolby Atmos.'),
  (3, 'Téléviseur HKC Full HD 40 pouces', 'Smart TV VIDAA, HDR10, Dolby Audio.'),
  (8, 'Téléviseur Coocaa 4K Mini LED 55 pouces', 'Google TV, HDR10+, écran mat antireflet.'),
  (26, 'Enceinte Bluetooth W-KING X20, 200 W', 'Basses puissantes, étanche : pour la maison et les fêtes.'),
  (14, 'Enceinte Bluetooth Ortizan X8 Pro, 40 W', 'Étanche IPX7, basses renforcées.'),
  (17, 'Enceinte Bluetooth ZEALOT S32 Pro', 'Caisson de basses et lumières LED, pour l’extérieur.'),
  (25, 'Enceinte Bluetooth ZEALOT P12, 60 W', 'Poignée de transport, 10 heures d’écoute.'),
  (28, 'Smartphone Realme 14 Pro+ 5G, 256 Go', 'Appareil photo Sony avec stabilisation, Snapdragon.'),
  (33, 'Smartphone robuste Cubot KingKong ES 3', 'Batterie 10 200 mAh, 256 Go, écran 120 Hz.'),
  (34, 'Smartphone DOOGEE Note 56', 'Écran 6,56 pouces, batterie 6 150 mAh.'),
  (35, 'Smartphone robuste Cubot KingKong Power 5', 'Batterie géante de 15 300 mAh, 128 Go.'),
  (41, 'Smartphone OnePlus Nord 5 5G', 'Snapdragon 8s, 8 Go + 256 Go ou 12 Go + 512 Go.'),
 ],
 'electro-energie': [
  (4, 'Kit de panneaux solaires rigides 150 à 450 W', 'Cadre en aluminium, 12 V, pour la maison.'),
  (5, 'Panneau solaire 300 W à cadre aluminium', 'Panneau photovoltaïque léger pour la maison et la boutique.'),
  (0, 'Panneau solaire flexible ASUNERGE, 100 à 600 W', 'Monocristallin, pliable et étanche.'),
  (14, 'Station d’énergie ALLPOWERS R1500 Lite, 1 056 Wh', 'Batterie LiFePO4, 1 600 W, rechargeable au solaire : courant pendant les délestages.'),
  (16, 'Station d’énergie OUKITEL P1000E Plus, 1 024 Wh', 'Batterie LiFePO4, 1 800 W, recharge solaire.'),
  (18, 'Station d’énergie ALLPOWERS R600, 299 Wh', 'Batterie LiFePO4, 600 W, fonction onduleur.'),
  (24, 'Centrale électrique OSCAL PowerMax 3600PE, 2 016 Wh', '3 600 W, batterie LiFePO4, recharge rapide.'),
  (31, 'Onduleur solaire hybride Easun, 2 à 4 kW', 'MPPT, onde sinusoïdale pure, hors réseau.'),
  (36, 'Onduleur solaire hybride ANENJI, 6,2 à 11 kW', '48 V, onde sinusoïdale pure, fonctionnement en parallèle.'),
  (28, 'Convertisseur pur sinus 1 000 à 4 000 W', 'De 12/24 V vers 220 V : branchez vos appareils sur batterie.'),
  (29, 'Onduleur pur sinus 2 500 à 5 000 W', 'De 12/24 V vers 220/230 V.'),
 ],
 'vehicules-motos': [
  (23, 'Moto électrique tout-terrain iScooter DX5 Pro', 'Roues de 17 pouces, batterie 20 Ah, 90 à 100 km d’autonomie.'),
  (17, 'Moto électrique iScooter DX5', 'Jusqu’à 72 km d’autonomie.'),
  (26, 'Motocross électrique EVERCROSS EV65M, 500 W', 'Cyclomoteur électrique tout-terrain, plusieurs modes de vitesse.'),
  (14, 'Moto électrique enfant EVERCROSS EV12M', 'Moteur 300 W, 25 km/h maximum, 15 km d’autonomie.'),
  (25, 'Moto électrique enfant RCB R9X', 'Moteur 300 W, batterie 36 V, 3 vitesses.'),
  ('vehicules-motos+', 28, 'Trottinette électrique HALO KNIGHT T108 Pro, 6 000 W', 'Double moteur, pour adultes, très puissante.'),
 ],
 'vehicules-tricycles': [
  (0, 'Tricycle cargo électrique FAFREES F20 Mate', 'Moteur 500 W, batterie 48 V, homologué UE.'),
  (2, 'Tricycle électrique 24 pouces avec panier arrière', 'Batterie 36 V 22,5 Ah, 7 vitesses, 50 à 80 km.'),
  (3, 'Tricycle cargo électrique à gros pneus 20 pouces', 'Batterie 48 V, pour transporter marchandises et courses.'),
  (5, 'Petit tricycle électrique pliant avec siège passager', 'Batterie amovible, pratique en ville.'),
  (7, 'Tricycle électrique familial 3 places, 750 W', 'Siège arrière, tout-terrain, batterie 48 V.'),
  (14, 'Tricycle électrique pliable 1 000 W double moteur', 'Batterie 48 V 30 Ah, pour la famille.'),
  (22, 'Tricycle électrique 2 places, 800 W', 'Batterie 48 V, roues de 10 pouces.'),
 ],
 'vehicules-voitures': [
  ('vehicules-voitures+', 4, 'Voiturette électrique à batterie lithium', 'Voiturette personnalisable pour sites touristiques, hôtels et résidences.'),
  ('vehicules-voitures+', 5, 'Voiturette électrique 4 à 6 places', 'Directement de l’usine, plusieurs modèles.'),
  ('vehicules-voitures+', 6, 'Voiturette électrique 4x4 tout-terrain, 2 à 6 places', '48/60/72 V, moteur de 4 000 à 7 500 W.'),
  ('vehicules-voitures+', 9, 'Véhicule électrique 4 roues, 2 à 8 places', 'Version route ou tout-terrain, 48/60/72 V.'),
  ('vehicules-voitures+', 13, 'Voiturette électrique 2 à 8 places, 5 kW', 'Sièges avec appuie-tête, personnalisable.'),
 ],
 'vehicules-utilitaires': [
  (15, 'Mini-dumper sur chenilles 1 tonne', 'Petit tombereau pour chantiers et exploitations.'),
  (16, 'Mini-dumper hydraulique sur chenilles 800 kg', 'Certifié CE, pour travaux de construction.'),
  (17, 'Mini-dumper compact 0,5 tonne', 'Pour la manutention des matériaux de construction.'),
  (24, 'Mini-dumper diesel 4x4 500 kg', 'Moteur diesel économique, sur chenilles.'),
  (27, 'Mini camion-benne 700 kg', 'Benne basculante, moteur homologué EURO 5 / EPA.'),
 ],
 'vehicules-engins': [
  (0, 'Mini-pelle 1 tonne, moteur Kubota', 'Sur chenilles, hydraulique : ferme, jardin, construction.'),
  (1, 'Mini-excavatrice 1,8 t sans déport arrière', 'Hydraulique, facile à utiliser.'),
  (5, 'Mini-excavatrice à cabine fermée 2 t', 'Sur chenilles, pour chantiers et exploitations.'),
  (6, 'Mini-excavatrice hydraulique 4 t à cabine fermée', 'Moteur EURO 5 / EPA.'),
  (12, 'Mini-excavatrice 6 t', 'Système hydraulique pour travaux agricoles et de construction.'),
  (15, 'Mini-tracteur agricole 25 à 35 CV avec pelle', 'Diesel, avec motoculteur et cultivateur.'),
  (16, 'Tracteur sur chenilles en caoutchouc, 25 à 100 CV', 'Pour les travaux agricoles.'),
  (18, 'Motoculteur diesel 35 CV sur chenilles', 'Tracteur multifonction 2 roues motrices.'),
  (26, 'Tracteur agricole compact 4x4 diesel', 'Agriculture, jardinage et transport.'),
  (27, 'Tracteur agricole 4x4, 30 à 50 CV', 'Mini-tracteur pour ferme et jardin.'),
 ],
 'vehicules-pieces': [
  (1, 'Casque de moto intégral à double visière', 'Homologué DOT, pour toutes les saisons.'),
  (2, 'Casque de moto tout-terrain avec lunettes', 'Casque intégral pour la piste et la route.'),
  (3, 'Casque de moto jet 3/4 rétro', 'Visage ouvert, style vintage.'),
  (4, 'Casque de moto à double visière', 'Pour homme et femme.'),
  (9, 'Casque de moto modulable rabattable', 'Homologué DOT, quatre saisons.'),
  (10, 'Demi-casque de moto', 'Léger, pour scooter et moto en ville.'),
  ('vehicules-pieces+', 0, 'Pneu de moto 2.75-17 tout-terrain', 'Tailles de 2.50 à 3.25, 17 et 18 pouces.'),
  ('vehicules-pieces+', 4, 'Pneus de moto 2.25 à 3.00 (17 et 18 pouces)', 'Pour l’avant et l’arrière.'),
  ('vehicules-pieces+', 8, 'Chambre à air de moto 2.50/2.75-17', 'Pour motos 125 à 150 cc.'),
  ('vehicules-motos+', 6, 'Jante complète de moto 125 cc (Haojue, Lifan, Loncin…)', 'Compatible avec de nombreuses motos chinoises.'),
  ('vehicules-motos+', 11, 'Carburateur pour Yamaha YBR 125', 'Système d’alimentation complet pour moteur 125 cc.'),
  ('vehicules-motos+', 15, 'Carburateur PD24J pour moteurs GY6 125-150 cc', 'Pour scooters, quads et tricycles.'),
  ('vehicules-motos+', 4, 'Béquille centrale pour GN125 / HJ125', 'Support de stationnement pour motos 125 cc.'),
  ('vehicules-tricycles+', 0, 'Boîte de vitesses à marche arrière pour tricycle 110-150 cc', 'Universelle, pour tricycles à moteur.'),
  ('vehicules-tricycles+', 9, 'Boîte de vitesses avant-arrière pour tricycle CG125/150/200', 'Pièce pour tricycles et rickshaws.'),
 ],
}

if __name__ == '__main__':
    brut = json.load(open(sys.argv[1]))
    out, vus = [], set()
    for cle, l in S.items():
        for e in l:
            src, i, nom, texte = (e if len(e) == 4 else (cle, *e))
            x = brut[src][i]
            if x['id'] in vus:
                continue
            vus.add(x['id'])
            devis = cle.startswith('vehicules-') and cle != 'vehicules-pieces'
            out.append({'sous': cle, 'rayon': 'vehicules' if cle.startswith('vehicules-') else 'electromenager', 'source': x['id'], 'nom': nom, 'texte': texte,
                        'fournisseur': x['t'], 'prix_eur': x['prix'], 'devis': devis, 'image': 'https:' + x['img'] if x['img'].startswith('//') else x['img'],
                        'lien': 'https://fr.aliexpress.com/item/%s.html' % x['id']})
    json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
    print(len(out), 'produits', sum(1 for o in out if o['devis']), 'sur devis')
