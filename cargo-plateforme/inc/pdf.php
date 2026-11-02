<?php
/**
 * Petit générateur de PDF autonome (aucune bibliothèque externe) : polices standard Helvetica et Helvetica gras
 * (accents français via l'encodage Windows-1252), textes alignés, rectangles, traits, images JPEG, codes-barres
 * Code 128, plusieurs pages. Suffisant pour la fiche d'expédition, l'étiquette et le reçu.
 */
if ( ! defined( 'ABSPATH' ) && ! defined( 'CP_TEST' ) ) {
	exit;
}

class CP_PDF {
	const MM = 2.834645669;            // points par millimètre
	private $pages = array();
	private $page = -1;
	private $w = 210, $h = 297;        // A4 en mm
	private $images = array();
	private $etats = array();          // transparences (ExtGState)
	private $police = 'F1', $taille = 10;
	private $couleur = array( 0, 0, 0 );

	private static $largeurs = null;

	public function __construct( $largeur_mm = 210, $hauteur_mm = 297 ) {
		$this->w = $largeur_mm;
		$this->h = $hauteur_mm;
		self::largeurs();
	}

	public function page() {
		$this->pages[] = '';
		$this->page = count( $this->pages ) - 1;
		return $this;
	}

	private function o( $s ) {
		$this->pages[ $this->page ] .= $s . "\n";
	}

	private static function n( $v ) {
		return rtrim( rtrim( sprintf( '%.3F', $v ), '0' ), '.' );
	}

	private function x( $mm ) {
		return self::n( $mm * self::MM );
	}

	private function y( $mm ) {
		return self::n( ( $this->h - $mm ) * self::MM );
	}

	/* ------------------------------------------------------------- couleurs et traits */
	public static function rvb( $hex ) {
		$hex = ltrim( (string) $hex, '#' );
		if ( 3 === strlen( $hex ) ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}
		if ( ! preg_match( '/^[0-9a-f]{6}$/i', $hex ) ) {
			return array( 0, 0, 0 );
		}
		return array( hexdec( substr( $hex, 0, 2 ) ), hexdec( substr( $hex, 2, 2 ) ), hexdec( substr( $hex, 4, 2 ) ) );
	}

	private static function c( $rvb ) {
		return self::n( $rvb[0] / 255 ) . ' ' . self::n( $rvb[1] / 255 ) . ' ' . self::n( $rvb[2] / 255 );
	}

	public function couleur( $rvb ) {
		$this->couleur = is_string( $rvb ) ? self::rvb( $rvb ) : $rvb;
		return $this;
	}

	/** Rectangle en mm ; $remplir et $contour : couleurs (#hex ou tableau) ou null. */
	public function rect( $x, $y, $l, $h, $remplir = null, $contour = null, $epaisseur = 0.3 ) {
		$op = '';
		$s = 'q ';
		if ( $remplir ) {
			$s .= self::c( is_string( $remplir ) ? self::rvb( $remplir ) : $remplir ) . ' rg ';
			$op .= 'f';
		}
		if ( $contour ) {
			$s .= self::c( is_string( $contour ) ? self::rvb( $contour ) : $contour ) . ' RG ' . self::n( $epaisseur * self::MM ) . ' w ';
			$op = $remplir ? 'B' : 'S';
		}
		if ( ! $op ) {
			return $this;
		}
		$this->o( $s . $this->x( $x ) . ' ' . $this->y( $y + $h ) . ' ' . self::n( $l * self::MM ) . ' ' . self::n( $h * self::MM ) . ' re ' . $op . ' Q' );
		return $this;
	}

	/** Rectangle aux angles arrondis (rayon $r en mm). */
	public function rect_arrondi( $x, $y, $l, $h, $r, $remplir = null, $contour = null, $epaisseur = 0.3 ) {
		$r = min( $r, $l / 2, $h / 2 );
		$k = 0.5523 * $r;
		return $this->chemin( array(
			array( 'm', $x + $r, $y ), array( 'l', $x + $l - $r, $y ),
			array( 'c', $x + $l - $r + $k, $y, $x + $l, $y + $r - $k, $x + $l, $y + $r ), array( 'l', $x + $l, $y + $h - $r ),
			array( 'c', $x + $l, $y + $h - $r + $k, $x + $l - $r + $k, $y + $h, $x + $l - $r, $y + $h ), array( 'l', $x + $r, $y + $h ),
			array( 'c', $x + $r - $k, $y + $h, $x, $y + $h - $r + $k, $x, $y + $h - $r ), array( 'l', $x, $y + $r ),
			array( 'c', $x, $y + $r - $k, $x + $r - $k, $y, $x + $r, $y ),
		), $remplir, $contour, $epaisseur, true );
	}

	public function cercle( $cx, $cy, $r, $remplir = null, $contour = null, $epaisseur = 0.3 ) {
		$k = 0.5523 * $r;
		return $this->chemin( array(
			array( 'm', $cx + $r, $cy ),
			array( 'c', $cx + $r, $cy + $k, $cx + $k, $cy + $r, $cx, $cy + $r ),
			array( 'c', $cx - $k, $cy + $r, $cx - $r, $cy + $k, $cx - $r, $cy ),
			array( 'c', $cx - $r, $cy - $k, $cx - $k, $cy - $r, $cx, $cy - $r ),
			array( 'c', $cx + $k, $cy - $r, $cx + $r, $cy - $k, $cx + $r, $cy ),
		), $remplir, $contour, $epaisseur, true );
	}

	/** Polygone ou ligne brisée : liste de points [x, y] en mm. */
	public function polygone( array $points, $remplir = null, $contour = null, $epaisseur = 0.3, $ferme = true ) {
		$p = array();
		foreach ( $points as $i => $pt ) {
			$p[] = array( $i ? 'l' : 'm', $pt[0], $pt[1] );
		}
		return $this->chemin( $p, $remplir, $contour, $epaisseur, $ferme );
	}

	/** Tracé générique : segments [m|l, x, y] ou [c, x1, y1, x2, y2, x3, y3] en mm. */
	public function chemin( array $segments, $remplir = null, $contour = null, $epaisseur = 0.3, $ferme = true ) {
		$s = 'q ';
		if ( $remplir ) {
			$s .= self::c( is_string( $remplir ) ? self::rvb( $remplir ) : $remplir ) . ' rg ';
		}
		if ( $contour ) {
			$s .= self::c( is_string( $contour ) ? self::rvb( $contour ) : $contour ) . ' RG ' . self::n( $epaisseur * self::MM ) . ' w 1 J 1 j ';
		}
		foreach ( $segments as $g ) {
			if ( 'c' === $g[0] ) {
				$s .= $this->x( $g[1] ) . ' ' . $this->y( $g[2] ) . ' ' . $this->x( $g[3] ) . ' ' . $this->y( $g[4] ) . ' ' . $this->x( $g[5] ) . ' ' . $this->y( $g[6] ) . ' c ';
			} else {
				$s .= $this->x( $g[1] ) . ' ' . $this->y( $g[2] ) . ' ' . $g[0] . ' ';
			}
		}
		if ( $ferme ) {
			$s .= 'h ';
		}
		$s .= $remplir && $contour ? 'B' : ( $remplir ? 'f' : ( $contour ? 'S' : 'n' ) );
		$this->o( $s . ' Q' );
		return $this;
	}

	public function trait( $x1, $y1, $x2, $y2, $couleur = '#000000', $epaisseur = 0.3, $pointille = false ) {
		$this->o( 'q ' . self::c( is_string( $couleur ) ? self::rvb( $couleur ) : $couleur ) . ' RG ' . self::n( $epaisseur * self::MM ) . ' w ' . ( true === $pointille ? '[3 2] 0 d ' : ( $pointille ? '[' . $pointille . '] 0 d ' : '' ) )
			. $this->x( $x1 ) . ' ' . $this->y( $y1 ) . ' m ' . $this->x( $x2 ) . ' ' . $this->y( $y2 ) . ' l S Q' );
		return $this;
	}

	/* ------------------------------------------------------------- texte */
	public function police( $gras = false, $taille = 10 ) {
		$this->police = $gras ? 'F2' : 'F1';
		$this->taille = $taille;
		return $this;
	}

	public static function cp1252( $s ) {
		$s = str_replace( array( "\u{202F}", "\u{00A0}", "\u{2009}" ), ' ', (string) $s );
		$s = str_replace( array( '→', '←', '✓' ), array( '–', '–', 'v' ), $s );
		if ( function_exists( 'mb_convert_encoding' ) ) {
			return mb_convert_encoding( $s, 'Windows-1252', 'UTF-8' );
		}
		return function_exists( 'iconv' ) ? (string) iconv( 'UTF-8', 'Windows-1252//TRANSLIT', $s ) : utf8_decode( $s );
	}

	/** Largeur d'un texte en mm avec la police et la taille courantes. */
	public function largeur( $texte ) {
		$t = self::cp1252( $texte );
		$table = self::$largeurs[ 'F2' === $this->police ? 1 : 0 ];
		$somme = 0;
		$n = strlen( $t );
		for ( $i = 0; $i < $n; $i++ ) {
			$somme += $table[ ord( $t[ $i ] ) ];
		}
		return $somme * $this->taille / 1000 / self::MM;
	}

	/** Texte sur une ligne ; $y = ligne de base en mm ; $align : g, c ou d (par rapport à x, ou à la boîte x..x+$l). */
	public function texte( $x, $y, $texte, $align = 'g', $l = 0 ) {
		if ( 'c' === $align ) {
			$x = $x + ( $l - $this->largeur( $texte ) ) / 2;
		} elseif ( 'd' === $align ) {
			$x = $x + $l - $this->largeur( $texte );
		}
		$t = str_replace( array( '\\', '(', ')', "\r" ), array( '\\\\', '\\(', '\\)', '' ), self::cp1252( $texte ) );
		$this->o( 'BT /' . $this->police . ' ' . self::n( $this->taille ) . ' Tf ' . self::c( $this->couleur ) . ' rg ' . $this->x( $x ) . ' ' . $this->y( $y ) . ' Td (' . $t . ') Tj ET' );
		return $this;
	}

	/** Paragraphe coupé à la largeur $l ; renvoie la position de la ligne suivante. */
	public function paragraphe( $x, $y, $l, $texte, $interligne = null ) {
		$interligne = $interligne ? $interligne : $this->taille * 0.45;
		foreach ( preg_split( '/\R/u', (string) $texte ) as $bloc ) {
			$ligne = '';
			foreach ( preg_split( '/\s+/u', trim( $bloc ) ) as $mot ) {
				$essai = '' === $ligne ? $mot : $ligne . ' ' . $mot;
				if ( '' !== $ligne && $this->largeur( $essai ) > $l ) {
					$this->texte( $x, $y, $ligne );
					$y += $interligne;
					$ligne = $mot;
				} else {
					$ligne = $essai;
				}
			}
			if ( '' !== $ligne ) {
				$this->texte( $x, $y, $ligne );
			}
			$y += $interligne;
		}
		return $y;
	}

	/* ------------------------------------------------------------- images JPEG */
	public function jpeg( $donnees, $x, $y, $l = 0, $h = 0, $opacite = 1 ) {
		$info = @getimagesizefromstring( $donnees );
		if ( ! $info || 2 !== $info[2] ) {
			return $this;
		}
		list( $pw, $ph ) = $info;
		if ( ! $l && ! $h ) {
			$l = $pw / 4;
		}
		if ( ! $h ) {
			$h = $l * $ph / $pw;
		}
		if ( ! $l ) {
			$l = $h * $pw / $ph;
		}
		$nom = 'I' . ( count( $this->images ) + 1 );
		$cs = ( isset( $info['channels'] ) && 4 === $info['channels'] ) ? 'DeviceCMYK' : ( ( isset( $info['channels'] ) && 1 === $info['channels'] ) ? 'DeviceGray' : 'DeviceRGB' );
		$this->images[ $nom ] = array( 'donnees' => $donnees, 'l' => $pw, 'h' => $ph, 'cs' => $cs );
		$gs = '';
		if ( $opacite < 1 ) {
			$e = 'GS' . ( count( $this->etats ) + 1 );
			$this->etats[ $e ] = $opacite;
			$gs = '/' . $e . ' gs ';
		}
		$this->o( 'q ' . $gs . self::n( $l * self::MM ) . ' 0 0 ' . self::n( $h * self::MM ) . ' ' . $this->x( $x ) . ' ' . $this->y( $y + $h ) . ' cm /' . $nom . ' Do Q' );
		return $this;
	}

	/** Image quelconque (PNG, WebP…) convertie en JPEG sur fond blanc avec GD ; renvoie les octets JPEG ou ''. */
	public static function vers_jpeg( $chemin_ou_octets, $est_fichier = true ) {
		$octets = $est_fichier ? @file_get_contents( $chemin_ou_octets ) : $chemin_ou_octets;
		if ( ! $octets ) {
			return '';
		}
		$info = @getimagesizefromstring( $octets );
		if ( $info && 2 === $info[2] ) {
			return $octets;
		}
		if ( ! function_exists( 'imagecreatefromstring' ) ) {
			return '';
		}
		$src = @imagecreatefromstring( $octets );
		if ( ! $src ) {
			return '';
		}
		$l = imagesx( $src );
		$h = imagesy( $src );
		$dst = imagecreatetruecolor( $l, $h );
		imagefill( $dst, 0, 0, imagecolorallocate( $dst, 255, 255, 255 ) );
		imagecopy( $dst, $src, 0, 0, 0, 0, $l, $h );
		ob_start();
		imagejpeg( $dst, null, 90 );
		return (string) ob_get_clean();
	}

	/* ------------------------------------------------------------- code-barres Code 128 (jeu B) */
	public function code128( $code, $x, $y, $l, $h, $couleur = '#000000' ) {
		static $motifs = array(
			'212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
			'221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
			'231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
			'314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
			'111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
			'114131', '311141', '411131', '211412', '211214', '211232', '2331112',
		);
		$code = preg_replace( '/[^\x20-\x7E]/', '', (string) $code );
		$valeurs = array( 104 );                       // départ B
		$somme = 104;
		$len = strlen( $code );
		for ( $i = 0; $i < $len; $i++ ) {
			$v = ord( $code[ $i ] ) - 32;
			$valeurs[] = $v;
			$somme += $v * ( $i + 1 );
		}
		$valeurs[] = $somme % 103;
		$valeurs[] = 106;                              // arrêt
		$modules = 0;
		foreach ( $valeurs as $v ) {
			$modules += array_sum( str_split( $motifs[ $v ] ) );
		}
		$modules += 20;                                // zones de silence (10 modules de chaque côté)
		$m = $l / $modules;
		$cx = $x + 10 * $m;
		foreach ( $valeurs as $v ) {
			$barre = true;
			foreach ( str_split( $motifs[ $v ] ) as $largeur ) {
				if ( $barre ) {
					$this->rect( $cx, $y, $largeur * $m, $h, $couleur );
				}
				$cx += $largeur * $m;
				$barre = ! $barre;
			}
		}
		return $this;
	}

	/* ------------------------------------------------------------- sortie */
	public function sortie() {
		$objets = array();
		$ajoute = function ( $contenu ) use ( &$objets ) {
			$objets[] = $contenu;
			return count( $objets );                   // numéro d'objet (1…)
		};
		$f1 = $ajoute( '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' );
		$f2 = $ajoute( '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>' );
		$xobj = '';
		foreach ( $this->images as $nom => $im ) {
			$num = $ajoute( array( '<< /Type /XObject /Subtype /Image /Width ' . $im['l'] . ' /Height ' . $im['h'] . ' /ColorSpace /' . $im['cs'] . ' /BitsPerComponent 8 /Filter /DCTDecode' . ( 'DeviceCMYK' === $im['cs'] ? ' /Decode [1 0 1 0 1 0 1 0]' : '' ) . ' /Length ' . strlen( $im['donnees'] ) . ' >>', $im['donnees'] ) );
			$xobj .= '/' . $nom . ' ' . $num . ' 0 R ';
		}
		$gs = '';
		foreach ( $this->etats as $nom => $op ) {
			$gs .= '/' . $nom . ' << /Type /ExtGState /ca ' . self::n( $op ) . ' /CA ' . self::n( $op ) . ' >> ';
		}
		$ressources = '<< /Font << /F1 ' . $f1 . ' 0 R /F2 ' . $f2 . ' 0 R >>' . ( $xobj ? ' /XObject << ' . $xobj . '>>' : '' ) . ( $gs ? ' /ExtGState << ' . $gs . '>>' : '' ) . ' >>';
		$pages_num = count( $objets ) + 1 + 2 * count( $this->pages );   // numéro réservé à l'objet /Pages
		$kids = array();
		foreach ( $this->pages as $contenu ) {
			$flux = function_exists( 'gzcompress' ) ? gzcompress( $contenu ) : $contenu;
			$c = $ajoute( array( '<< /Length ' . strlen( $flux ) . ( function_exists( 'gzcompress' ) ? ' /Filter /FlateDecode' : '' ) . ' >>', $flux ) );
			$kids[] = $ajoute( '<< /Type /Page /Parent ' . $pages_num . ' 0 R /MediaBox [0 0 ' . self::n( $this->w * self::MM ) . ' ' . self::n( $this->h * self::MM ) . '] /Resources ' . $ressources . ' /Contents ' . $c . ' 0 R >>' );
		}
		$p = $ajoute( '<< /Type /Pages /Kids [' . implode( ' ', array_map( function ( $k ) {
			return $k . ' 0 R';
		}, $kids ) ) . '] /Count ' . count( $kids ) . ' >>' );
		$catalogue = $ajoute( '<< /Type /Catalog /Pages ' . $p . ' 0 R >>' );
		$sortie = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
		$positions = array();
		foreach ( $objets as $i => $obj ) {
			$positions[ $i + 1 ] = strlen( $sortie );
			if ( is_array( $obj ) ) {
				$sortie .= ( $i + 1 ) . " 0 obj\n" . $obj[0] . "\nstream\n" . $obj[1] . "\nendstream\nendobj\n";
			} else {
				$sortie .= ( $i + 1 ) . " 0 obj\n" . $obj . "\nendobj\n";
			}
		}
		$xref = strlen( $sortie );
		$sortie .= "xref\n0 " . ( count( $objets ) + 1 ) . "\n0000000000 65535 f \n";
		for ( $i = 1; $i <= count( $objets ); $i++ ) {
			$sortie .= sprintf( "%010d 00000 n \n", $positions[ $i ] );
		}
		$sortie .= "trailer\n<< /Size " . ( count( $objets ) + 1 ) . ' /Root ' . $catalogue . " 0 R >>\nstartxref\n" . $xref . "\n%%EOF\n";
		return $sortie;
	}

	/* ------------------------------------------------------------- largeurs des polices standard (unités /1000) */
	private static function largeurs() {
		if ( null !== self::$largeurs ) {
			return;
		}
		$ascii = array(
			// Helvetica, codes 32 à 126
			array( 278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
				1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
				333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584 ),
			// Helvetica-Bold
			array( 278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
				975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
				333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584 ),
		);
		// lettres accentuées de Windows-1252 : même largeur que la lettre de base
		$base = array( 0xC0 => 'A', 0xC1 => 'A', 0xC2 => 'A', 0xC3 => 'A', 0xC4 => 'A', 0xC5 => 'A', 0xC7 => 'C', 0xC8 => 'E', 0xC9 => 'E', 0xCA => 'E', 0xCB => 'E',
			0xCC => 'I', 0xCD => 'I', 0xCE => 'I', 0xCF => 'I', 0xD1 => 'N', 0xD2 => 'O', 0xD3 => 'O', 0xD4 => 'O', 0xD5 => 'O', 0xD6 => 'O', 0xD9 => 'U', 0xDA => 'U', 0xDB => 'U', 0xDC => 'U', 0xDD => 'Y',
			0xE0 => 'a', 0xE1 => 'a', 0xE2 => 'a', 0xE3 => 'a', 0xE4 => 'a', 0xE5 => 'a', 0xE7 => 'c', 0xE8 => 'e', 0xE9 => 'e', 0xEA => 'e', 0xEB => 'e',
			0xEC => 'i', 0xED => 'i', 0xEE => 'i', 0xEF => 'i', 0xF1 => 'n', 0xF2 => 'o', 0xF3 => 'o', 0xF4 => 'o', 0xF5 => 'o', 0xF6 => 'o', 0xF9 => 'u', 0xFA => 'u', 0xFB => 'u', 0xFC => 'u', 0xFD => 'y', 0xFF => 'y' );
		$speciaux = array( array( 0x80 => 556, 0x85 => 1000, 0x92 => 222, 0x91 => 222, 0x93 => 333, 0x94 => 333, 0x96 => 556, 0x97 => 1000, 0x9C => 944, 0x8C => 1000, 0xAB => 556, 0xBB => 556, 0xB0 => 400, 0xA0 => 278 ),
			array( 0x80 => 556, 0x85 => 1000, 0x92 => 278, 0x91 => 278, 0x93 => 500, 0x94 => 500, 0x96 => 556, 0x97 => 1000, 0x9C => 944, 0x8C => 1000, 0xAB => 556, 0xBB => 556, 0xB0 => 400, 0xA0 => 278 ) );
		self::$largeurs = array();
		foreach ( array( 0, 1 ) as $g ) {
			$t = array_fill( 0, 256, 556 );
			foreach ( $ascii[ $g ] as $i => $v ) {
				$t[ 32 + $i ] = $v;
			}
			foreach ( $base as $code => $lettre ) {
				$t[ $code ] = $t[ ord( $lettre ) ];
			}
			foreach ( $speciaux[ $g ] as $code => $v ) {
				$t[ $code ] = $v;
			}
			self::$largeurs[ $g ] = $t;
		}
	}
}
