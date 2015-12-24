import {describe, describe as context, it} from 'mocha';
import {expect} from 'chai';

import * as CanvasCore from '../../src/core/CanvasCore';

import {initialState as initialReduxState} from '../TestData';
const {treeViewOptions: initialViewOptions} = initialReduxState;

describe('CanvasCore', () => {

    // Utilities for generating the initial canvas state,
    // optionally setting the view options as well.
    const s0 = () => CanvasCore.initialState();
    const s0v = (v = initialViewOptions) => CanvasCore.setViewOptions(s0(), v);

    it("provides an initial state", () =>
        expect(s0()).to.be.an('object'));

    it("sets the view options", () => {
        const initialState = s0v();
        expect(initialState.viewOptions).to.be.an('object');
        const newViewOptions = {
            ...initialViewOptions,
            infiniteLevels: 3.14,
        };
        const newState = s0v(newViewOptions);
        expect(newState.viewOptions).to.be.an('object');
        expect(newState.viewOptions).to.deep.equal(newViewOptions);
    });

    it("sets the canvas dimensions", () => {
        const newState = CanvasCore.setCanvasDimensions(s0v(), 123, 456);
        expect(newState.canvasDimensions.width).to.equal(123);
        expect(newState.canvasDimensions.height).to.equal(456);
        expect(newState.viewOptions).to.deep.equal(initialViewOptions);
    });

    it("gets the row dimensions, in canvas coordinates", () => {
        const initialState = CanvasCore.setViewOptions(
            CanvasCore.initialState(),
            { ...initialViewOptions, infiniteLevels: 3.5 });
        expect(initialState.canvasDimensions.width).to.equal(800);
        expect(initialState.canvasDimensions.height).to.equal(600);
        expect(CanvasCore.getRowDimensions(initialState)).to.deep.equal({
            width: 800,
            height: 600 / 3.5,
        });
    });

    it("provides a reasonable value for the maximum safe row", () => {
        const maxSafeRow = CanvasCore.getMaxSafeRow();
        expect(maxSafeRow).to.be.a('number');
        expect(maxSafeRow).to.be.at.least(25);
        expect(maxSafeRow).to.be.at.most(75);
    });

    describe("#getScalingFactor", () => {
        const {getScalingFactor, getScalingFactorForHeight} = CanvasCore;
        it("of 1\u00D7 when at the top", () =>
            expect(getScalingFactorForHeight(0)).to.equal(1));
        it("of 2\u00D7 when one row down", () =>
            expect(getScalingFactorForHeight(1)).to.equal(2));
        it("of 4\u00D7 when two rows down", () =>
            expect(getScalingFactorForHeight(2)).to.equal(4));
        it("of 1\u00D7 given the initial state", () =>
            expect(getScalingFactor(s0v())).to.equal(1));
    });

    describe("#getPanResult", () => {
        const {getPanResult} = CanvasCore;
        const xy = (x, y) => ({ x, y });
        //
        // Fix some dimensions so we get predictable results.
        const state = {
            ...CanvasCore.setCanvasDimensions(s0v({
                ...initialViewOptions,
                infiniteLevels: 4,
            }), 600, 400),
        };
        //
        // Allow overriding the (actually internal) 'position' field.
        const sp = position => ({ ...state, position });
        //
        context("retains the initial state when the displacement", () => {
            const none = xy(0, 0);
            it("is horizontal", () =>
                expect(getPanResult(state, xy(100, 0))).to.deep.equal(none));
            it("points upward", () =>
                expect(getPanResult(state, xy(0, -50))).to.deep.equal(none));
            it("points upward and to the right", () =>
                expect(getPanResult(state, xy(50, -50))).to.deep.equal(none));
        });
        context("pans straight down", () => {
            // test4: test panning down by four different distances
            const test4 = (initialPosition) => {
                const baseState = sp(initialPosition);
                const {x: initialX, y: initialY} = initialPosition;
                const test1 = (deltaCanvas, deltaPosition) =>
                    expect(getPanResult(baseState, xy(0, deltaCanvas)))
                        .to.deep.equal(xy(initialX, initialY + deltaPosition));
                it("by half a level",       () => test1(50,  0.5));
                it("by a single level",     () => test1(100, 1));
                it("by a level and a half", () => test1(150, 1.5));
                it("by two levels",         () => test1(200, 2));
            };
            context("from the initial state, ", () =>
                test4({ x: 0, y: 0 }));
            context("from a state that's already panned down, ", () =>
                test4({ x: 0, y: 0.75 }));
            context("from a state that's already panned diagonally, ", () =>
                test4({ x: 0.1, y: 0.75 }));
        });
        context("pans horizontally", () => {
            context("from the centerline in the first level", () => {
                // In this scenario, the viewport can see half the row
                // and is centered in the center of the canvas.
                // The viewport's absolute width is 0.5 units.
                // At its most extreme rightward position,
                // its right edge will be at position 0.5,
                // so its center will be at position 0.25.
                // The full canvas appears to be 1200px wide in canvas units.
                const state = sp(xy(0, 1));
                it("halfway across the viewport", () =>
                    expect(getPanResult(state, xy(150, 0)))
                        .to.deep.equal(xy(0.125, 1)));
                it("to the right edge of the viewport", () =>
                    expect(getPanResult(state, xy(300, 0)))
                        .to.deep.equal(xy(0.25, 1)));
                it("without going out of bounds to the right", () =>
                    expect(getPanResult(state, xy(305, 0)))
                        .to.deep.equal(xy(0.25, 1)));
                it("to the left edge of the viewport", () =>
                    expect(getPanResult(state, xy(-300, 0)))
                        .to.deep.equal(xy(-0.25, 1)));
                it("without going out of bounds to the left", () =>
                    expect(getPanResult(state, xy(-305, 0)))
                        .to.deep.equal(xy(-0.25, 1)));
            });
            context("from halfway right along the second level", () => {
                // In this scenario, the viewport can see a quarter of the row
                // and occupies the third quartile of the canvas.
                // The viewport's absolute width is 0.25 units,
                // and its leftmost edge is at position 0,
                // so its rightmost edge is at position 0.25
                // and its center is at position 0.125.
                // The full canvas appears to be 2400px wide in canvas units.
                const farEdge = 0.375;
                const initialX = 0.125;
                const state = sp(xy(initialX, 2));
                //
                // The remaining distance to the right
                // is a quarter of the canvas (0.25 absolute units),
                // which takes up 600 pixels (incidentally, a full viewport).
                it("all the way to the right", () =>
                    expect(getPanResult(state, xy(600, 0)))
                        .to.deep.equal(xy(farEdge, 2)));
                //
                // Per the above, half the remaining distance
                // is 0.125 absolute units, or 300 pixels.
                it("half the remaining distance to the right", () =>
                    expect(getPanResult(state, xy(300, 0)))
                        .to.deep.equal(xy(initialX + 0.125, 2)));
                //
                // We want to move from the third quartile to the first,
                // so our center will shift from 0.125 to -0.125,
                // a shift of -0.25,
                // which works out to 600 pixels.
                it("to the left, traversing half the full tree", () =>
                    expect(getPanResult(state, xy(-600, 0)))
                        .to.deep.equal(xy(initialX - 0.25, 2)));
                //
                // Similarly, the left edge
                // is (initialX + 0.5) = 0.625 absolute units away,
                // which works out to 1500 pixels.
                it("all the way to the left", () =>
                    expect(getPanResult(state, xy(-1200, 0)))
                        .to.deep.equal(xy(-farEdge, 2)));
                //
                // Of course, we don't want to exceed the bounds.
                // We take the analogous values from above and add padding.
                it("without going out of bounds to the right", () =>
                    expect(getPanResult(state, xy(605, 0)))
                        .to.deep.equal(xy(farEdge, 2)));
                it("without going out of bounds to the left", () =>
                    expect(getPanResult(state, xy(-1205, 0)))
                        .to.deep.equal(xy(-farEdge, 2)));
            });
        });
        context("pans diagonally", () => {
            //
            // The point of these test cases is to ensure that
            // we're using the scaling factor from the new y-position
            // to determine the horizontal translation.
            // That is, we need to compute the y-position first
            // and use that to compute the x-position.
            context("from the origin", () => {
                it("down a level and halfway to the right", () =>
                    expect(getPanResult(state, xy(150, 100)))
                        .to.deep.equal(xy(0.125, 1)));
                it("down a level and halfway to the left", () =>
                    expect(getPanResult(state, xy(-150, 100)))
                        .to.deep.equal(xy(-0.125, 1)));
            });
            context("from halfway right across the second level", () => {
                // (See the 'pans horizontally' section above
                // for an explanation of these values.)
                const farEdge = 0.375;
                const initialX = 0.125;
                const state = sp(xy(initialX, 2));
                //
                // Half the remaining distance to the right
                // is (0.375 - 0.125) / 2 = 0.25 / 2 = 0.125 units,
                // Once we've moved up a level, this will corespond
                // to (1200 pixels * 0.125) = 150 pixels.
                it("up a level and half the remainder to the right", () =>
                    expect(getPanResult(state, xy(150, -100)))
                        .to.deep.equal(xy(initialX + 0.125, 1)));
                //
                // Similarly, the full distance is 0.25 units = 300 pixels.
                const farEdgeAbove = 0.25;
                it("up a level and all the way to the right", () =>
                    expect(getPanResult(state, xy(300, -100)))
                        .to.deep.equal(xy(farEdgeAbove, 1)));
                //
                it("up a level and past all the way to the right", () =>
                    expect(getPanResult(state, xy(305, -100)))
                        .to.deep.equal(xy(farEdgeAbove, 1)));
                //
                // To go back to the centerline, we need to cover -0.125 units;
                // if we've moved down a level
                // so that the scaling factor is 8,
                // the full tree width will be 4800 pixels,
                // so we'll need to drag -600 pixels.
                it("down a level and back to the centerline", () =>
                    expect(getPanResult(state, xy(-600, 100)))
                        .to.deep.equal(xy(0, 3)));
            });
        });
    });

});
