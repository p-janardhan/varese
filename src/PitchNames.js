const [flat, sharp] = ["\u266D", "\u266F"];
const baseTable = [
    "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
];
const prettify = (x) => x.replace("#", sharp).replace("b", flat);
const prettyTable = baseTable.map(prettify);

/*
 * Input: number of semitones above middle C.
 *
 * Output: note name in scientific pitch notation.
 * If pretty = true, use proper sharp and flat symbols.
 */
export function pitchToName(semitones, pretty = false) {
    const octaveOffset = Math.floor(semitones / 12);
    const octaveName = octaveOffset + 4;

    const phase1 = semitones % 12;
    const phase = phase1 < 0 ? phase1 + 12 : phase1;

    return (pretty ? prettyTable : baseTable)[phase] + octaveName;
}

/*
 * Input: a string like "C4" or "Ab6" or "F\u266F-1";
 * that is, a string in scientific pitch notation
 * where negative octaves are allowed
 * and accidentals can be either plain or pretty.
 *
 * Output: the number of semitones above middle C,
 * or null if it is not a valid note.
 */
export function nameToPitch(name) {
    const pat = /^([A-Ga-g])([#\u266F]*|[b\u266D]*)(-?\d+)$/;
    const match = name.match(pat);
    if (!match) {
        return null;
    }
    const letter = match[1].toUpperCase();
    const accidentals = prettify(match[2]);
    const number = parseInt(match[3], 10);

    const accidental = accidentals.charAt(0);
    const accidentalShift =
        accidental === sharp ? accidentals.length :
        accidental === flat ? -accidentals.length :
        /* undefined; no text given */ 0;

    const octaveShift = (number - 4) * 12;

    const base = ({
        "C": 0,
        "D": 2,
        "E": 4,
        "F": 5,
        "G": 7,
        "A": 9,
        "B": 11,
    })[letter];

    return base + octaveShift + accidentalShift;
}

export default {
    pitchToName,
    nameToPitch,
};
