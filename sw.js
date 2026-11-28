// ¡Se me fue el camión! — service worker (V58.8.29).
// V58.8.29: jefes de «RECURSOS_CURADOS_V1» (Poseidón, Pulpo Rey, Emperador Marciano y El Maestro en moto roja).
// V58.8.28: enemigos secretos extra (robot centinela, murciélago alienígena, piraña furiosa y medusa eléctrica).
// V58.8.27: banco de cristales, tienda de mejoras, calificación por misión y reparto protagonista por tramo.
// V58.8.26: perseguidores en moto en La Calzada (el niño de las piedras y El Maestro Enojón).
// V58.8.25: La Calzada en la moto de Doña Tóxica, panoramas de la Calzada y cinemática «la moto de mi mamá».
// V58.8.24: misión especial LA CALZADA (persecución en el camión de la Ruta 6) y sus cinemáticas; contratos de
// tramo (cada tramo es una misión con objetivo, opcional y efecto: noche, lluvia o viento).
// Precarga el juego completo (código versionado, fondos de los niveles —incluidos submarino y espacial—, sprites y audio) para jugar sin red.
// Cachés anteriores: camion-v55-parallax-real (V55), camion-v57-thematic-villains (V57), camion-v58-mundos-al-doble (V58),
// camion-v58-1-mundos-pintados (V58.1). Se invalidan al activar esta versión (V58.2: mar submarino, enemigos marinos
// con atlas, cuerdas para columpiarse y la cinemática de la llegada al mar), camion-v58-2-llegada-al-mar (V58.2).
// V58.3: Sofía buceando solo dentro del agua del mar y la banda sonora de fondo del mundo marino (camion-v58-3-buceo-y-banda-mar).
// V58.4: corrientes marinas fuertes en el mar y lluvia de asteroides en la Luna (camion-v58-4-corrientes-asteroides).
// V58.5: correcciones de la revisión completa (cinemática del mar, textos del menú) y entrega empaquetada (camion-v58-5-entrega).
// V58.6: menú compacto, apertura en penumbra, ropa por nivel y la barda con vidrios que se cruza con el columpio
// (camion-v58-6-menu-columpio).
// V58.7: zonas secretas del mar y de la Luna, sus enemigos, el Pulpo del Abismo y El Maestro Enojón.
// V58.8.11: canal a 2× nativo, colisiones retocadas y parallax transparente de plancton/burbujas.
// V58.8.12: parallax ambiental Guadalajara V58.4.1 adaptado (cielo + ciudad lejana; mapas intactos).
// Cada instalación mantiene el caché de su propia carpeta.
const SCOPE = self.registration.scope;
const CACHE_PREFIX = 'camion-web:' + SCOPE + '|';
const CACHE = CACHE_PREFIX + '58.8.29';
const CODE=["assets/player/sofia_roblox/sofia_atlas_data.js?v=58.8.14", "assets/player/sofia_roblox/sofia_parafalls_adapter.js?v=58.8.14", "js/app/parafalls_roblox_atlases.js?v=58.8.14", "css/game.css?v=58.8.1", "css/toxifamilia_style.css?v=58.8.17", "css/toxifamilia.css?v=58.8.25", "css/release_visual.css?v=58.8.27", "js/core/util.js?v=58.8.1", "js/core/config.js?v=58.8.29", "js/core/parafalls_data.js?v=58.8.13", "js/core/levels.js?v=58.8.29", "js/core/story.js?v=58.8.23", "js/core/toxifamilia_style.js?v=58.8.29", "js/core/toxifamilia.js?v=58.8.28", "js/core/physics.js?v=58.8.24", "js/core/enemies.js?v=58.8.29", "js/core/obstacles.js?v=58.8.1", "js/core/contracts.js?v=58.8.29", "js/core/upgrades.js?v=58.8.27", "js/core/world.js?v=58.8.29", "js/core/game.js?v=58.8.27", "js/core/chase.js?v=58.8.29", "js/app/art_data.js?v=58.8.1", "js/app/art_secretos.js?v=58.8.6", "js/app/art_extra.js?v=58.8.29", "js/app/art_production.js?v=58.8.1", "js/app/render.js?v=58.8.29", "js/app/chase_render.js?v=58.8.29", "js/app/input.js?v=58.8.1", "js/app/audio.js?v=58.8.24", "js/app/ui.js?v=58.8.27", "js/app/main.js?v=58.8.27", "js/app/toxifamilia_cinematic.js?v=58.8.25"];
const SHELL=['Se_Me_Fue_El_Camion.html','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-512-maskable.png','assets/audio/cancion_fondo_v40.mp3','assets/audio/guadalajara_aventura_v24.mp3','assets/audio/ambiente_escuela_v24.mp3','assets/audio/ambiente_calles_guadalajara_v24.mp3','assets/audio/luna_maullido_v24.mp3','assets/audio/morita_maullido_v24.mp3','assets/audio/luna_ronroneo_v31.mp3','assets/audio/morita_ronroneo_v31.mp3','assets/audio/luna_alerta_v31.mp3','assets/audio/morita_alerta_v31.mp3','assets/audio/sofia_otro_gato_usuario_v38.mp3','assets/audio/mar_chinos_de_seda_fondo_v58_3.mp3','assets/audio/motor_camion_guadalajara_v25.mp3','assets/audio/boss_intro_v37.mp3','assets/audio/boss_windup_v37.mp3','assets/audio/boss_hit_v37.mp3','assets/audio/boss_defeat_v37.mp3','assets/vehicles/camion_frame_01.png','assets/vehicles/camion_frame_02.png','assets/vehicles/camion_frame_03.png','assets/vehicles/camion_frame_04.png','assets/companions/luna.png','assets/companions/luna_shoulder.png','assets/companions/morita.png','assets/companions/morita_shoulder.png'];
const SCENES=["assets/scenes/generated/anden_tren_ligero_guadalajara.webp", "assets/scenes/generated/guadalajara_colonia_noche.webp", "assets/scenes/generated/mercado_tapatio_amanecer.webp", "assets/scenes/generated/parque_metropolitano_atardecer.webp", "assets/scenes/generated/plaza_jacarandas_noche.webp", "assets/scenes/generated/terminal_guadalajara_amanecer.webp", "assets/scenes/generated/zapopan_basilica_noche.webp", "assets/scenes/guadalajara_pro_v2/bg_guadalajara_pro_v2.webp", "assets/scenes/guadalajara_pro_v2/transit_street.webp", "assets/scenes/guadalajara_pro_v2/bg_portales_pro_v2.webp", "assets/scenes/guadalajara_pro_v2/bg_centro_historico_pro_v2.webp", "assets/scenes/guadalajara_pro_v2/architecture_guadalajara_pro_v2.png", "assets/scenes/guadalajara_pro_v2/architecture_portales_pro_v2.png", "assets/scenes/guadalajara_pro_v2/architecture_centro_historico_pro_v2.png", "assets/scenes/school_miguel_hidalgo/01_aulas_superiores.webp", "assets/scenes/school_miguel_hidalgo/02_patio_escolar.webp", "assets/scenes/school_miguel_hidalgo/03_conserjeria_entrada.webp"];
const ART=["assets/player/sofia/air_01.png", "assets/player/sofia/cheer_01.png", "assets/player/sofia/cheer_02.png", "assets/player/sofia/cheer_03.png", "assets/player/sofia/dive_01.png", "assets/player/sofia/idle_01.png", "assets/player/sofia/kick_01.png", "assets/player/sofia/kick_02.png", "assets/player/sofia/kick_03.png", "assets/player/sofia/kick_04.png", "assets/player/sofia/land_01.png", "assets/player/sofia/run_01.png", "assets/player/sofia/run_02.png", "assets/player/sofia/run_03.png", "assets/player/sofia/run_04.png", "assets/platforms/brick.png", "assets/platforms/concrete.png", "assets/platforms/hazard.png", "assets/platforms/scaffold.png", "assets/platforms/stone_long.png", "assets/platforms/stone_moss.png", "assets/platforms/stone_rocks.png", "assets/platforms/stone_slim.png", "assets/platforms/stone_small.png", "assets/platforms/tiles_a.png", "assets/platforms/tiles_b.png", "assets/platforms/wood_table.png", "assets/platforms/plank.png", "assets/player/sofia/swim_atlas.png", "assets/enemies/v50/dog/alert_02.png", "assets/enemies/v50/dog/alert_03.png", "assets/enemies/v50/dog/dead_01.png", "assets/enemies/v50/dog/walk_02.png", "assets/enemies/v50/dog/walk_03.png", "assets/enemies/v50/dog/walk_04.png", "assets/enemies/v50/kid/alert_01.png", "assets/enemies/v50/kid/alert_02.png", "assets/enemies/v50/kid/alert_03.png", "assets/enemies/v50/kid/alert_04.png", "assets/enemies/v50/kid/alert_05.png", "assets/enemies/v50/kid/dead_02.png", "assets/enemies/v50/kid/hurt_01.png", "assets/enemies/v50/kid/hurt_02.png", "assets/enemies/v50/kid/hurt_03.png", "assets/enemies/v50/kid/idle_01.png", "assets/enemies/v50/kid/idle_02.png", "assets/enemies/v50/kid/idle_03.png", "assets/enemies/v50/kid/idle_04.png", "assets/enemies/v50/kid/idle_05.png", "assets/enemies/v50/kid/idle_06.png", "assets/enemies/v50/kid/walk_01.png", "assets/enemies/v50/kid/walk_02.png", "assets/enemies/v50/kid/walk_03.png", "assets/enemies/v50/kid/walk_04.png", "assets/enemies/v50/kid/walk_05.png", "assets/enemies/v50/kid/walk_06.png", "assets/enemies/v50/rat/alert_01.png", "assets/enemies/v50/rat/alert_02.png", "assets/enemies/v50/rat/alert_04.png", "assets/enemies/v50/rat/dead_01.png", "assets/enemies/v50/rat/hurt_01.png", "assets/enemies/v50/rat/hurt_02.png", "assets/enemies/v50/rat/hurt_03.png", "assets/enemies/v50/rat/hurt_04.png", "assets/enemies/v50/rat/walk_01.png", "assets/enemies/v50/rat/walk_02.png", "assets/enemies/v50/rat/walk_03.png", "assets/backgrounds/atlas_parallax_city.webp"];
const CAT_FRAMES=['luna','morita'].flatMap(cat=>['idle','walk'].flatMap(action=>Array.from({length:action==='idle'?6:4},(_,i)=>`assets/companions/${cat}_${action}_v38_0${i+1}.png`)));
// V53 · gatitas submarinas (6 idle + 4 walk + hombro por gata).
const SUB_FRAMES=['luna','morita'].flatMap(cat=>[...Array.from({length:6},(_,i)=>`assets/companions/sub/${cat}_idle_sub_0${i+1}.png`),...Array.from({length:4},(_,i)=>`assets/companions/sub/${cat}_walk_sub_0${i+1}.png`),`assets/companions/sub/${cat}_shoulder_sub.png`]);
// V53 · variantes de aspecto de Sofía (uniforme escolar y rosa): mismos 15 frames que el aspecto original.
const NINA_VARIANTS=['uniforme','rosa'].flatMap(v=>['idle_01','run_01','run_02','run_03','run_04','air_01','land_01','dive_01','kick_01','kick_02','kick_03','kick_04','cheer_01','cheer_02','cheer_03'].map(f=>`assets/player/variants/${v}/${f}.png`));
// V58: fondos del tamaño del nivel (capas aportadas), mar, órbita y siluetas de la cinemática ARCHIVO 01.
const V58_ART=["assets/cinematica/dona_toxica.svg", "assets/cinematica/estoker.svg", "assets/parallax/guadalajara/azoteas/00_cielo_degradado.webp", "assets/parallax/guadalajara/azoteas/01_nubes_reales.webp", "assets/parallax/guadalajara/azoteas/02_arquitectura_anclada.webp", "assets/parallax/guadalajara/azoteas/03_reflejos_luces.webp", "assets/parallax/guadalajara/azoteas/04_bruma_frontal.webp", "assets/parallax/guadalajara/barrios_inferiores/00_cielo_degradado.webp", "assets/parallax/guadalajara/barrios_inferiores/01_nubes_reales.webp", "assets/parallax/guadalajara/barrios_inferiores/02_arquitectura_anclada.webp", "assets/parallax/guadalajara/barrios_inferiores/03_reflejos_luces.webp", "assets/parallax/guadalajara/barrios_inferiores/04_bruma_frontal.webp", "assets/parallax/guadalajara/mercado_parque/00_cielo_degradado.webp", "assets/parallax/guadalajara/mercado_parque/01_nubes_reales.webp", "assets/parallax/guadalajara/mercado_parque/02_arquitectura_anclada.webp", "assets/parallax/guadalajara/mercado_parque/03_reflejos_luces.webp", "assets/parallax/guadalajara/mercado_parque/04_bruma_frontal.webp", "assets/parallax/guadalajara_v584/00_cielo_atardecer.webp", "assets/parallax/guadalajara_v584/01_ciudad_lejana.webp"];
// V59: mundo marino de tres páginas (canal inundado, bosque de algas y fosa azul); Luna conserva sus páginas V5.
const DEPTH_ART=["assets/scenes/underwater/v59/canal_inundado_redisenio.webp", "assets/scenes/underwater/v59/bosque_algas.webp", "assets/scenes/underwater/v59/fosa_azul.webp", "assets/parallax/espacial/depth_v5/background/page_01.webp", "assets/parallax/espacial/depth_v5/background/page_02.webp", "assets/parallax/espacial/depth_v5/background/page_03.webp", "assets/parallax/espacial/depth_v5/layers/01_estrellas_lejanas.png", "assets/parallax/espacial/depth_v5/layers/04_naves_satelites.png", "assets/parallax/espacial/depth_v5/layers/05_basura_meteoritos.png", "assets/parallax/espacial/depth_v5/layers/06_polvo_caverna.png", "assets/parallax/espacial/depth_v5/layers/07_luz_cristales.png", "assets/parallax/marino/depth_v4/layers/05_plancton_flotante.png", "assets/parallax/marino/depth_v4/layers/06_burbujas_ligeras.png"]
// V58.8.13 · Parafalls PRO V2: tres escenas más sus seis capas ambientales.
const ROBLOX_PARAFALLS_ART=['assets/player/sofia_roblox/sofia_atlas.png','assets/companions/roblox_parafalls/luna/atlas.png','assets/companions/roblox_parafalls/morita/atlas.png'];
// V58.8.24: La Calzada (moto de Doña Tóxica, panoramas y cinemática «la moto de mi mamá»).
// V58.8.28: enemigos secretos extra (atlas limpios).
const EXTRA_FOES_ART=['assets/enemies/extra/robot_centinela.webp','assets/enemies/extra/murcielago_alienigena.webp','assets/enemies/extra/pirana_furiosa.webp','assets/enemies/extra/medusa_electrica.webp','assets/enemies/extra/marciano_v2.webp','assets/enemies/extra/poseidon_v2.webp','assets/enemies/extra/pulpo_rey.webp','assets/enemies/extra/emperador_marciano.webp'];
const CALZADA_ART=["assets/calzada/cine/moto_mama_01.webp", "assets/calzada/cine/moto_mama_02.webp", "assets/calzada/cine/moto_mama_03.webp", "assets/calzada/cine/moto_mama_04.webp", "assets/calzada/cine/moto_mama_05.webp", "assets/calzada/cine/moto_mama_06.webp", "assets/calzada/cine/moto_mama_07.webp", "assets/calzada/cine/moto_mama_08.webp", "assets/calzada/cine/moto_mama_09.webp", "assets/calzada/enemigos/maestro_11.webp", "assets/calzada/enemigos/maestro_12.webp", "assets/calzada/enemigos/maestro_13.webp", "assets/calzada/enemigos/maestro_21.webp", "assets/calzada/enemigos/maestro_22.webp", "assets/calzada/enemigos/maestro_23.webp", "assets/calzada/enemigos/maestro_31.webp", "assets/calzada/enemigos/maestro_32.webp", "assets/calzada/enemigos/maestro_33.webp", "assets/calzada/enemigos/maestro_41.webp", "assets/calzada/enemigos/maestro_42.webp", "assets/calzada/enemigos/maestro_43.webp", "assets/calzada/enemigos/maestro_jefe_moto.webp", "assets/calzada/enemigos/nino_11.webp", "assets/calzada/enemigos/nino_12.webp", "assets/calzada/enemigos/nino_13.webp", "assets/calzada/enemigos/nino_21.webp", "assets/calzada/enemigos/nino_22.webp", "assets/calzada/enemigos/nino_23.webp", "assets/calzada/enemigos/nino_31.webp", "assets/calzada/enemigos/nino_32.webp", "assets/calzada/enemigos/nino_33.webp", "assets/calzada/enemigos/nino_41.webp", "assets/calzada/enemigos/nino_42.webp", "assets/calzada/enemigos/nino_43.webp", "assets/calzada/fondos/agua_azul.webp", "assets/calzada/fondos/macro_calzada.webp", "assets/calzada/fondos/mercado_san_juan.webp", "assets/calzada/fondos/morelos.webp", "assets/calzada/moto/moto_01.webp", "assets/calzada/moto/moto_02.webp", "assets/calzada/moto/moto_03.webp", "assets/calzada/moto/moto_04.webp", "assets/calzada/moto/moto_05.webp", "assets/calzada/moto/moto_06.webp", "assets/calzada/moto/moto_07.webp", "assets/calzada/moto/moto_08.webp", "assets/calzada/moto/moto_09.webp", "assets/calzada/moto/moto_10.webp", "assets/calzada/moto/moto_11.webp", "assets/calzada/moto/moto_12.webp"];
const PARAFALLS_CINEMATIC=['assets/cinematica/parafalls/sofia_roblox_01.webp','assets/cinematica/parafalls/sofia_roblox_02.webp','assets/cinematica/parafalls/sofia_roblox_03.webp','assets/cinematica/parafalls/sofia_roblox_04.webp','assets/cinematica/parafalls/sofia_roblox_05.webp','assets/cinematica/parafalls/sofia_roblox_06.webp','assets/cinematica/parafalls/sofia_roblox_07.webp','assets/cinematica/parafalls/sofia_roblox_08.webp','assets/cinematica/parafalls/sofia_roblox_09.webp','assets/cinematica/parafalls/sofia_roblox_10.webp','assets/cinematica/parafalls/sofia_roblox_11.webp','assets/cinematica/parafalls/sofia_roblox_12.webp','assets/cinematica/parafalls/forest_approach.webp','assets/cinematica/parafalls/portal_reveal.webp','assets/cinematica/parafalls/estoker_roblox.webp','assets/cinematica/parafalls/sofia_00_front_idle.png','assets/cinematica/parafalls/sofia_01_front_blink.png','assets/cinematica/parafalls/sofia_02_look_up.png','assets/cinematica/parafalls/luna_idle_00.png','assets/cinematica/parafalls/luna_idle_01.png','assets/cinematica/parafalls/morita_idle_00.png','assets/cinematica/parafalls/morita_idle_01.png'];
const PARAFALLS_ART=['assets/scenes/waterfalls/parafalls_v2/scene_01.webp','assets/scenes/waterfalls/parafalls_v2/scene_02.webp','assets/scenes/waterfalls/parafalls_v2/scene_03.webp','assets/scenes/waterfalls/parafalls_v2/depth/atmosphere_01.webp','assets/scenes/waterfalls/parafalls_v2/depth/foreground_01.webp','assets/scenes/waterfalls/parafalls_v2/depth/atmosphere_02.webp','assets/scenes/waterfalls/parafalls_v2/depth/foreground_02.webp','assets/scenes/waterfalls/parafalls_v2/depth/atmosphere_03.webp','assets/scenes/waterfalls/parafalls_v2/depth/foreground_03.webp'];
// V58.1: personajes con traje (atlas aportados): Sofía y gatitas astronautas, niño gordito astronauta y buzo.
const CAST=["assets/player/astronauta/dash.webp", "assets/player/astronauta/down.webp", "assets/player/astronauta/fall.webp", "assets/player/astronauta/hurt.webp", "assets/player/astronauta/idle.webp", "assets/player/astronauta/jump.webp", "assets/player/astronauta/kick_1.webp", "assets/player/astronauta/kick_2.webp", "assets/player/astronauta/land.webp", "assets/player/astronauta/rise.webp", "assets/player/astronauta/victory_1.webp", "assets/player/astronauta/victory_2.webp", "assets/player/astronauta/victory_3.webp", "assets/player/astronauta/walk_a.webp", "assets/player/astronauta/walk_b.webp", "assets/companions/space/luna_idle.webp", "assets/companions/space/luna_jump.webp", "assets/companions/space/luna_walk_a.webp", "assets/companions/space/luna_walk_b.webp", "assets/companions/space/morita_idle.webp", "assets/companions/space/morita_jump.webp", "assets/companions/space/morita_walk_a.webp", "assets/companions/space/morita_walk_b.webp", "assets/enemies/v50/kid_astronauta/guard.webp", "assets/enemies/v50/kid_astronauta/hurt.webp", "assets/enemies/v50/kid_astronauta/idle_01.webp", "assets/enemies/v50/kid_astronauta/idle_02.webp", "assets/enemies/v50/kid_astronauta/idle_03.webp", "assets/enemies/v50/kid_astronauta/idle_04.webp", "assets/enemies/v50/kid_astronauta/jump_air.webp", "assets/enemies/v50/kid_astronauta/jump_prepare.webp", "assets/enemies/v50/kid_astronauta/land.webp", "assets/enemies/v50/kid_astronauta/throw_prepare.webp", "assets/enemies/v50/kid_astronauta/throw_projectile.webp", "assets/enemies/v50/kid_astronauta/throw_recovery.webp", "assets/enemies/v50/kid_astronauta/throw_release.webp", "assets/enemies/v50/kid_astronauta/throw_windup.webp", "assets/enemies/v50/kid_astronauta/victory.webp", "assets/enemies/v50/kid_astronauta/walk_01.webp", "assets/enemies/v50/kid_astronauta/walk_02.webp", "assets/enemies/v50/kid_astronauta/walk_03.webp", "assets/enemies/v50/kid_astronauta/walk_04.webp", "assets/enemies/v50/kid_astronauta/walk_05.webp", "assets/enemies/v50/kid_buzo/guard.webp", "assets/enemies/v50/kid_buzo/hurt.webp", "assets/enemies/v50/kid_buzo/idle_01.webp", "assets/enemies/v50/kid_buzo/idle_02.webp", "assets/enemies/v50/kid_buzo/idle_03.webp", "assets/enemies/v50/kid_buzo/idle_04.webp", "assets/enemies/v50/kid_buzo/jump_air.webp", "assets/enemies/v50/kid_buzo/jump_prepare.webp", "assets/enemies/v50/kid_buzo/land.webp", "assets/enemies/v50/kid_buzo/throw_prepare.webp", "assets/enemies/v50/kid_buzo/throw_projectile.webp", "assets/enemies/v50/kid_buzo/throw_recovery.webp", "assets/enemies/v50/kid_buzo/throw_release.webp", "assets/enemies/v50/kid_buzo/throw_windup.webp", "assets/enemies/v50/kid_buzo/victory.webp", "assets/enemies/v50/kid_buzo/walk_01.webp", "assets/enemies/v50/kid_buzo/walk_02.webp", "assets/enemies/v50/kid_buzo/walk_03.webp", "assets/enemies/v50/kid_buzo/walk_04.webp", "assets/enemies/v50/kid_buzo/walk_05.webp", "assets/enemies/v50/kid_piedra.webp"];
// V58.2: atlas de los enemigos marinos (tiburón, piraña, pulpo y Poseidón) y la cinemática de la llegada al mar.
const MAR='assets/cinematica/marino/',marSeq=(n,c)=>Array.from({length:c},(_,i)=>MAR+n+'_'+String(i).padStart(2,'0')+'.webp');
const V582=[...['tiburon','tiburon_fx','pirana','pirana_fx','pulpo','poseidon','poseidon_fx'].map(f=>'assets/enemies/marinos/'+f+'.webp'),
 ...['fondo_isla_cima','fondo_isla_orilla','fondo_playa','fondo_costa','fondo_descenso','fondo_santuario'].map(f=>MAR+f+'.webp'),
 ...['original','uniforme','rosa'].flatMap(l=>marSeq('sofia_'+l+'_asombro',6)),...marSeq('paseo_mano',12),...marSeq('estoker_platica',12),
 ...marSeq('estoker_explica',7),...marSeq('tiburon_nado',7),...marSeq('pirana_nado',7),...marSeq('pulpo_flota',6),...marSeq('pulpo_tinta',6),
 ...marSeq('poseidon_tridente',6)];
// V58.7: atlas limpios de los enemigos secretos y de los jefes nuevos, y los fondos de las dos zonas secretas.
const V587=[...['pulpito','buzito','marciano','astronino'].map(f=>'assets/enemies/secretos/'+f+'.webp'),
 ...['maestro','pulpo_abismo'].map(f=>'assets/enemies/jefes/'+f+'.webp'),
 ...['marino_oculto','espacial_oculto'].map(f=>'assets/backgrounds/secretos/'+f+'.webp')];
const PRODUCTION_ASSETS=["assets/production/luna_space/atlas.json","assets/production/luna_space/atlas.png","assets/production/luna_sub/atlas.json","assets/production/luna_sub/atlas.png","assets/production/maestro_enojon/atlas.json","assets/production/maestro_enojon/atlas.png","assets/production/marciano_espacial/atlas.json","assets/production/marciano_espacial/atlas.png","assets/production/morita_space/atlas.json","assets/production/morita_space/atlas.png","assets/production/morita_sub/atlas.json","assets/production/morita_sub/atlas.png","assets/production/nino_espacial/atlas.json","assets/production/nino_espacial/atlas.png","assets/production/nino_marino/atlas.json","assets/production/nino_marino/atlas.png","assets/production/pulpo_abismo/atlas.json","assets/production/pulpo_abismo/atlas.png","assets/production/pulpo_marino/atlas.json","assets/production/pulpo_marino/atlas.png","assets/production/sofia_astronauta/atlas.json","assets/production/sofia_astronauta/atlas.png","assets/production/sofia_buceadora/atlas.json","assets/production/sofia_buceadora/atlas.png","assets/production/tiburon_feroz/atlas.json","assets/production/tiburon_feroz/atlas.png"];
const EXTRA_ASSETS = [
  'assets/ui/worlds_v21/escuela.webp',
  'assets/ui/worlds_v21/espacial.webp',
  'assets/ui/worlds_v21/guadalajara.webp',
  'assets/ui/worlds_v21/luna.webp',
  'assets/ui/worlds_v21/morita.webp',
  'assets/ui/worlds_v21/parafalls.webp',
  'assets/ui/worlds_v21/sofia.webp',
  'assets/ui/worlds_v21/submarino.webp',

  'assets/scenes/school_pro/room_archivo.webp',
  'assets/scenes/school_pro/room_conserjeria.webp',
  'assets/scenes/school_pro/room_laboratorio.webp',
  'assets/backgrounds/secretos/aula_escolar_oculta.webp',
  'assets/scenes/school_pro/01_aulas_superiores.webp',
  'assets/scenes/school_pro/02_patio_escolar.webp',
  'assets/scenes/school_pro/03_conserjeria_entrada.webp',
  'assets/scenes/school_pro/school_signs.json',
  'assets/scenes/school_pro/school_signs.png',
  'assets/scenes/school_pro/school_furniture.png',
  'assets/scenes/school_pro/school_furniture.json',
  'assets/scenes/school_pro/street_material.webp',
  'assets/scenes/school_pro/school_exit_facade.webp',
  'assets/scenes/school_pro/school_bus.png',
  'assets/parallax/marino/abyss_v7/marine_objects.png',
  'assets/parallax/marino/abyss_v7/marine_objects.json',
  'assets/player/sofia/sofia_submarina_complementaria.png',
  'assets/fx/release_fx_rgba.png',
  'assets/fx/release_fx_rgba.json',
  'assets/fx/combat_hd.png',
  'assets/fx/combat_hd.json',
  'assets/fx/water_energy_hd.png',
  'assets/fx/water_energy_hd.json',
  'assets/ui/pickups_pro.png',
  'assets/ui/pickups_pro.json',
  'assets/ui/jump.svg',
  'assets/ui/kick.svg',
  'assets/ui/dash.svg',
  'assets/ui/down.svg',
  'assets/ui/cats.svg',
];
const LLEGADAS = [
  "assets/cinematica/llegadas/isla_canal.webp",
  "assets/cinematica/llegadas/estacion_lunar.webp",
  "assets/cinematica/llegadas/estoker_00.webp",
  "assets/cinematica/llegadas/estoker_04.webp",
  "assets/cinematica/llegadas/estoker_08.webp",
  "assets/cinematica/llegadas/estoker_11.webp",
  "assets/cinematica/llegadas/estoker_original.webp",
  "assets/cinematica/llegadas/gruta_cascada.webp",
  "assets/cinematica/llegadas/sofia_02.webp",
  "assets/cinematica/llegadas/sofia_04.webp",
  "assets/cinematica/llegadas/sofia_06.webp",
  "assets/cinematica/llegadas/sofia_08.webp",
  "assets/cinematica/llegadas/sofia_10.webp",
  "assets/cinematica/llegadas/sofia_11.webp"
];
const PRECACHE = [...new Set([
  "assets/scenes/underwater/v59/santuario_poseidon_v23.webp",
  ...CODE, ...LLEGADAS, ...SHELL, ...SCENES, ...ART, ...CAT_FRAMES, ...SUB_FRAMES, ...NINA_VARIANTS,
  ...V58_ART, ...DEPTH_ART, ...PARAFALLS_ART, ...ROBLOX_PARAFALLS_ART, ...PARAFALLS_CINEMATIC, ...CALZADA_ART, ...EXTRA_FOES_ART,
  ...CAST, ...V582, ...V587, ...PRODUCTION_ASSETS, ...EXTRA_ASSETS
])];
const INDEX = new URL('index.html', SCOPE).href;
const GAME = new URL('Se_Me_Fue_El_Camion.html', SCOPE).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Cientos de respuestas abiertas a la vez pueden atascar la instalación en WebView.
    const batchSize = 4;
    try {
      for (let i = 0; i < PRECACHE.length; i += batchSize) {
        const group = PRECACHE.slice(i, i + batchSize);
        await Promise.all(group.map(url => cache.add(url)));
      }
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && key !== CACHE) await caches.delete(key);
      // La 58.8.17 dejaba un caché vacío cuando fallaba la precarga.
      if (key === 'camion-v58-8-17-parafalls-results') {
        const legacy = await caches.open(key);
        if (!(await legacy.keys()).length) await caches.delete(key);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(SCOPE)) return;
  const url = new URL(request.url);
  const path = url.origin + url.pathname;
  const navigation = request.mode === 'navigate';
  let key = request;
  if (navigation && (path === SCOPE || path === INDEX)) key = INDEX;
  if (navigation && path === GAME) key = GAME;
  const networkFirst = navigation || /\.(html|json|js|css|webmanifest)$/.test(url.pathname);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (!networkFirst) {
      const hit = await cache.match(key);
      if (hit) return hit;
    }
    try {
      const response = await fetch(request);
      if (response.status === 200 && !request.headers.has('Range')) {
        event.waitUntil(cache.put(key, response.clone()).catch(() => {}));
      }
      return response;
    } catch (error) {
      const hit = await cache.match(key);
      if (hit) return hit;
      throw error;
    }
  })());
});
