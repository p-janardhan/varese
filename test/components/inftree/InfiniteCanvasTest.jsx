/*
 * This is a *very* minimal test for InfiniteCanvas;
 * it just ensures that the component renders without error
 * when passed a variety of different sets of 'viewOptions'.
 * The main logic tests are in:
 *      test/core/CanvasCoreTest.js
 *      test/core/CanvasUIAdapterTest.js
 *
 * This test is also not super robust
 * because we have to mock out a bunch of things that are used
 * in InfiniteCanvas and CanvasUIAdapter;
 * in particular, we have to generate a mock CanvasContext2D
 * with the methods we use.
 * So if it suddenly starts failing,
 * maybe see if you need to mock something else.
 */
import {describe, it} from 'mocha';
import {expect} from 'chai';

import React, {Component} from 'react';

import {
    renderIntoDocument,
    scryManyWithClass,
    declareMochaMock,
} from '../../TestUtils';
import {initialState, canonicalRationalizer} from '../../TestData';

import InfiniteCanvas from '../../../src/components/inftree/InfiniteCanvas';

describe('InfiniteCanvas', () => {

    const noop = () => {};
    const propsToMockAsNoop = [
        'addEventListener',
        'removeEventListener',
        'setInterval',
        'clearInterval',
    ];
    propsToMockAsNoop.forEach(prop => declareMochaMock(window, prop, noop));
    declareMochaMock(window, 'getComputedStyle', () => ({ width: "720px" }));
    const canvasMockClassName = 'mocked-canvas-component';
    class CanvasMock extends Component {
        render() {
            return <div className={canvasMockClassName} />;
        }
        constructor() {
            super();
            this.width = 720;
            this.height = initialState.treeViewOptions.infiniteHeight || 480;
        }
        getContext() {
            return {
                arc: noop,
                beginPath: noop,
                canvas: this,
                clearRect: noop,
                fill: noop,
                fillStyle: '',
                fillText: noop,
                lineTo: noop,
                measureText: () => 100,
                moveTo: noop,
                stroke: noop,
                strokeStyle: '',
                textAlign: 'left',
                textBaseline: 'baseline',
            };
        }
    }
    const originalCreateElement = React.createElement;
    declareMochaMock(React, 'createElement', (...args) => {
        const newArgs = args[0] === 'canvas' ?
            [CanvasMock, ...args.slice(1)] :
            args;
        return originalCreateElement.apply(React, newArgs);
    });

    const baseViewOptions = initialState.treeViewOptions;
    const runSpec = ({ when, newViewOptions }) => {
        const suffix = when === null ? '' : ` when ${when}`;
        const specName = `should render a <canvas>${suffix}`;
        const viewOptions = {
            ...baseViewOptions,
            ...newViewOptions,
        };
        it(specName, () => {
            const element = <InfiniteCanvas
                viewOptions={viewOptions}
                rationalizer={canonicalRationalizer}
            />;
            const component = renderIntoDocument(element);
            expect(scryManyWithClass(component, canvasMockClassName))
                .to.have.length(1);
        });
    };
    const specs = [{
        when: null,
        newViewOptions: {},
    }, {
        when: "'showRoots' has been changed",
        newViewOptions: { showRoots: !baseViewOptions.showRoots },
    }, {
        when: "'highQuality' has been changed",
        newViewOptions: { highQuality: !baseViewOptions.highQuality },
    }, {
        when: "'rainbowFactor' has been changed",
        newViewOptions: { rainbowFactor: 0.2 - baseViewOptions.rainbowFactor },
    }, {
        when: "a chord is invisible",
        newViewOptions: {
            treeNumber: 1,
            limits: {
                ...baseViewOptions.limits,
                minCombined: 88,
                minCombinedEnabled: true,
            },
        },
    }];
    specs.forEach(runSpec);

});
