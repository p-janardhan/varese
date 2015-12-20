import React, {Component, PropTypes} from 'react';

import {parseNameOrPitch} from '../PitchNames';

/*
 * Input node for a single pitch.
 * Allows a separate "display text" from "default editing text":
 * for example, if octaves are hidden, the display text might be "C",
 * but the default editing text should be something like "C5",
 * because the user will be required to enter the octave
 * even when the octaves are hidden;
 * in other words, the default editing text must always parse.
 *
 * When the user makes a change that parses to a valid note,
 * the onChange callback is invoked with two arguments:
 * first, the new pitch as a number (semitones above middle C, as is standard),
 * and second, the current editing text;
 * the latter might be something like "cb5",
 * which is distinct from the actual "C[flat-symbol]5"
 * that would be output from the pretty-printer.
 * In most cases, the callback won't need the editing text, but...
 *
 * In some cases, a change event might induce changes beyond just this pitch.
 * For example, if the note being edited is the E in a C4, E4, G4 chord
 * and the user changes the "E4" to an "e5" (note the lowercase),
 * then the chord suddenly becomes C4, G4, E5;
 * in particular, the contents of the G4 and E5 input fields must interchange.
 * The 'takeStateFrom' method exists to help solve this problem:
 * in the case above, the callback function should make a call like
 *     topInputNode.takeStateFrom(middleInputNode, displayText),
 * where 'displayText' is, in the case, "e5".
 * Immediately after this call, the state will look like "C4, E4, e5",
 * but presumably this will have triggered a re-render
 * that will update the state of the no-longer-focused middle node.
 *
 * Still confused? It may help to check out
 * the _handleChange method of TrichordView,
 * which is the main consumer of this API.
 */
export default class SingleNoteInput extends Component {

    constructor() {
        super();
        this.state = {
            text: null,
        };
    }

    render() {
        const text = this.state.text !== null ?
            this.state.text :
            this.props.displayValue;
        return <input
            ref="input"
            type="text"
            value={text}
            size={3}
            onChange={() => this._handleChange()}
            onFocus={() => this.setState({ text: this.props.value })}
            onBlur={() => this.setState({ text: null })}
            onKeyDown={this.props.onKeyDown}
            style={this.props.style}
        />;
    }

    /*
     * Copy the input state from another SingleNoteInput,
     * and reset that input's state to the default state;
     * that is, roughly, consume the state, don't borrow it.
     */
    takeStateFrom(that, text) {
        const thisInput = this.refs.input;
        const thatInput = that.refs.input;

        // Grab state before an onFocus handler mutates it.
        const thatOldState = that.state;

        // Copy focus.
        if (document.activeElement === thatInput) {
            thisInput.focus();
        }

        // Copy state.
        this.setState({...thatOldState, text});
        that.setState({ text: null });
    }

    setDisplayText(text) {
        this.setState({ text });
    }

    focusDOMNode() {
        this.refs.input.focus();
    }

    _handleChange() {
        const text = this.refs.input.value;
        this.setState({ text });

        const value = parseNameOrPitch(text);
        if (value !== null) {
            this.props.onChange(value, text);
        }
    }

}
SingleNoteInput.propTypes = {
    displayValue: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,

    // (number, string) => void; takes
    //   * the new pitch after successful parse, and
    //   * the current text entered by the user,
    //     which might need to be copied to a different element.
    onChange: PropTypes.func.isRequired,

    onKeyDown: PropTypes.func,

    style: PropTypes.object,
};
