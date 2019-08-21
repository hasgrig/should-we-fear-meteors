// if the data you are going to import is small, then you can import it using es6 import
// import MY_DATA from './app/data/example.json'
// (I tend to think it's best to use screaming snake case for imported json)
import {max, min} from 'd3-array';
import {select} from 'd3-selection';
import {csv} from 'd3-fetch';
import {interpolateCubehelixLong} from 'd3-interpolate';
import {forceCollide, forceSimulation, forceY, forceX} from 'd3-force';
import {scaleLinear, scaleBand} from 'd3-scale';
import {axisBottom, axisTop} from 'd3-axis';
import {rgb, cubehelix} from 'd3-color';
import {annotationLabel, annotation} from 'd3-svg-annotation';
const domReady = require('domready');

domReady(() => {
  csv('./data/tempdata.csv').then((data) => {
    myVis(data);
  });
});

function myVis(data) {
  // The posters will all be 24 inches by 36 inches
  // Your graphic can either be portrait or landscape, up to you
  // the important thing is to make sure the aspect ratio is correct.

  // portrait
  const height = 5000;
  const width = 36 / 24 * height;

  const scaleData = 0.8;

  data.forEach((d) => {
    d['Cumulative Impact Probability'] = Number(d['Cumulative Impact Probability']);
    d.Radius = Number(d.Radius * scaleData);
    d['Energy log'] = Number(d['Energy log']);
    d.Energy = Number(d.Energy);
    d['Prob sqrt'] = Number(d['Prob sqrt']);
    d['Object Name'] = d['Object Name'].trim().replace(/\s+/g, '-');
  });

  const maxE = max(data.map((d) => {
    if (d['Cumulative Impact Probability'] === 1) {
      return 0;
    }
    return d['Cumulative Impact Probability'];
  }));

  const minE = min(data.map(d => d['Cumulative Impact Probability']));

  const colorScale = scaleLinear()
    .domain([Math.log(minE), Math.log(maxE)])
    .range([cubehelix(-240, 0.5, 0.85), cubehelix(300, 0.5, 0.2)])
    .interpolate(interpolateCubehelixLong);

  const poster = select('.vis-container')
    .attr('height', height)
    .attr('width', width);

  buildTitle(poster, width / 4, (height / 24) * 1.5);

  const dataVis = poster
    .append('g')
    .attr('class', 'data-vis')
    .attr('transform', `translate(0, ${height / 12})`)
    .attr('width', width);

  const xScale = scaleLinear()
    .domain([min(data.map(d => d['Energy log'])), max(data.map(d => d['Energy log']))])
    .range([400, width - 400]);
  const yScale = scaleLinear()
    .domain([min(data.map(d => d['Prob sqrt'])), max(data.map(d => d['Prob sqrt']))])
    .range([0.03, 1]);
  const yp = scaleLinear()
    .domain([min(data.map(d => d['Prob sqrt'])), max(data.map(d => d['Prob sqrt']))])
    .range([-2600, 0]);
  const yn = scaleLinear()
    .domain([min(data.map(d => d['Prob sqrt'])), max(data.map(d => d['Prob sqrt']))])
    .range([2600, 0]);

  dataVis.append('circle')
    .attr('r', 959.6915518 * scaleData)
    .attr('fill', rgb('#aa0000'))
    .attr('cx', width - 980)
    .attr('cy', 0)
    .attr('opacity', 1)
    .attr('class', 'dinosaur-asteroid')
    .attr('transform', `translate(0, ${height * 3 / 8})`);

  buildProbabilityLine(poster, height, width);
  buildDamageLine(poster, height, width);

  const node = dataVis.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('r', (d) => d.Radius)
      .attr('fill', (d) => {
        if (d['Cumulative Impact Probability'] === 1) {
          return '#aa0000';
        }

        return colorScale(Math.log(d['Cumulative Impact Probability']));
      })
      .attr('id', d => `asteroid-${d['Object Name']}`)
      .attr('class', d => d['Object Name'])
      .attr('transform', `translate(0, ${(height * 3 / 8)})`);

  const simulation = forceSimulation()
    .velocityDecay(0.4)
    .force('x', forceX(d => xScale(d['Energy log'])).strength(1))
    .force('y', forceY(0).strength(d => yScale(d['Prob sqrt'])))
    .force('collide', forceCollide().radius(d => d.Radius + 2).iterations(15))
    .nodes(data)
    .on('tick', tick);

  data.forEach((d, i) => {
    d.y = i % 2 ? yp(d['Prob sqrt']) : yn(d['Prob sqrt']);
  });

  function tick() {
    node
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y);
  }

  buildLegend(poster, height, width);

  simulation.on('end', () => {
    createAnnotations(dataVis, height, data, width);
  });

  addSourceInfo(poster, width * 3 / 5 + 800, Number(height) * 1 / 12 + 430);
}

/*
 * Creates/places title and names on the visualization/poster.
 */
function buildTitle(poster, x, y) {
  const title = poster
    .append('g')
    .attr('class', 'title');
  title.append('text')
    .text('Should We Fear Meteors?')
    .attr('x', x)
    .attr('y', y)
    .attr('font-size', '350')
    .attr('font-family', 'Helvetica');

  title.append('g')
    .html(`<text id="names">\
            <tspan x="100" y="100"> Jose Arreluce </tspan>
            <tspan x="100" y="200"> Dominic DiCarlo </tspan>
            <tspan x="100" y="300"> Hasmik Grigoryan </tspan>
          </text>`
    )
    .attr('x', 0)
    .attr('y', 100)
    .attr('font-size', 100)
    .attr('font-family', 'Helvetica');
}

/*
 * Adds information about the source for the dataset used in the visualization
 * to the poster at the given x and y coordinates.
 */
function addSourceInfo(poster, x, y) {
  const posterInfoG = poster.append('g')
    .attr('class', 'vis-info');

  posterInfoG
  .append('text')
    .text('Data collected from NASA\'s Asteroid Impacts Dataset on Kaggle.')
    .attr('x', x)
    .attr('y', y)
    .attr('font-size', 55);

  posterInfoG
  .append('text')
    .text('Source of dataset is the NASA Sentry System.')
    .attr('x', x)
    .attr('y', y + 75)
    .attr('font-size', 55);
}

/*
 * buildLegend --> Builds and places the svg elements used in the visualization's
 * legend.
 */
function buildLegend(poster, height, width) {
  const legend = poster
    .append('g')
    .attr('class', 'legend');

  // adding the definition for the gradient
  const svgDefs = legend.append('defs');

  const mainGradient = svgDefs.append('linearGradient')
      .attr('id', 'mainGradient');

  // append multiple color stops by using D3's data/enter step c(cubeHelix)
  mainGradient.selectAll('stop')
      .data([
          {offset: '0%', color: '#D9F2EE'},
          {offset: '12.5%', color: '#C4D5F0'},
          {offset: '25%', color: '#C8AEE9'},
          {offset: '37.5%', color: '#D482B4'},
          {offset: '50%', color: '#C27876'},
          {offset: '62.5%', color: '#8C7B43'},
          {offset: '72%', color: '#467A36'},
          {offset: '82.5%', color: '#1C6445'},
          {offset: '95%', color: '#1A3D4D'},
          {offset: '100%', color: '#512047'}
      ])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

  // some positioning constants to move scales around easily
  const probabilityX = 400;
  const probabilityY = (4.75 / 6) * height;
  const scaleHeight = (1 / 34) * height;
  const scaleWidth = 2 * width / 5;

  // the rectangle with the gradient (the scale bar)
  legend.append('rect')
    .attr('height', scaleHeight)
    .attr('width', scaleWidth)
    .attr('fill', 'url(#mainGradient)')
    .attr('transform', `translate(${probabilityX}, ${probabilityY})`);

  legend.append('text')
    .text('Probability Scale')
    .attr('font-size', '4em')
    .attr('font-family', 'Helvetica')
    .attr('transform', `translate(${probabilityX + 10.5 * scaleWidth / 27},
      ${probabilityY + 3 * scaleHeight / 2})`);

  // the probability ticks
  makeTicks(probabilityX, scaleWidth, probabilityY, legend);

  // one hundred tick array for building the energy scale
  const oneToHundred = Array(...(null, {length: 100})).map(Number.call, Number);

  // energy scale function that converts energy to energy scale ticks
  function damageScale(x) {
    return Math.cbrt(x / 781250) * scaleWidth;
  }

  // energy scale with one hundred ticks

  const energyX = width - scaleWidth - probabilityX;

  const energyY = probabilityY;

  legend.selectAll('.scaleRects')
  .data(oneToHundred)
  .enter().append('rect')
    .attr('class', 'scaleRects')
    .attr('x', energyX)
    .attr('y', energyY)
    .attr('width', d => damageScale(d * 7812.5))
    .attr('height', scaleHeight)
    .attr('fill', 'none')
    .attr('stroke', 'black')
    .attr('stroke-width', 1);

  legend.append('text')
    .text('Damage Scale')
    .attr('font-size', '4em')
    .attr('font-family', 'Helvetica')
    .attr('transform', `translate(${energyX + 5 * scaleWidth / 11}, ${probabilityY + 3 * scaleHeight / 2})`);

  makeLabels(damageScale, energyX, energyY, scaleHeight, scaleWidth, legend);

  // legend box
  legend.append('rect')
    .attr('height', (1 / 6) * height)
    .attr('width', width)
    .attr('fill', 'none')
    .attr('stroke', '#000')
    .attr('stroke-width', 0)
    .attr('transform', `translate(0, ${(5 / 6) * height})`);

  /*
  * Generates an HTML string for line separated text.
  */
  function buildText(text, offset, x, y) {
    let descriptionText = [];

    text.forEach((txt, i) => {
      const newSpan = `<tspan x='${x}' y='${y + offset + 55 + (55 * (i + 1))}'>${txt} </tspan>`;
      descriptionText.push(newSpan);
    });

    descriptionText = descriptionText.join(' ');

    const htmlString = `<text style='font-size: 3em'>\
      ${descriptionText}
    </text>`;
    legend.append('g')
      .html(htmlString);
  }

  const energyDescripText = [
    'Damage (defined as the estimated kinetic energy of an impactor) is encoded by the',
    'size of the circle. The damage was scaled down by taking the cube root of it,',
    'and this value was used as the area of each circle. This scale has 100 ticks drawn',
    'on it, with each tick representing one unit of damage. The Chicxulub Dinosaur',
    'Extinction event asteroid represents over 100 times the damage of the most',
    'damaging potential impactor.'
  ];

  const probabilityDescripText = [
    'The probability scale is logarithmic and uses the cube helix color scale',
    'as a means of encoding. The cube helix color scale varies both hue and luminance.',
    'The variations in hue separate the scale into discrete ranges of probability,',
    'while the luminance varies linearly which illustrates a general trend from light',
    'to dark representing low probability to high probability.'
  ];

  buildText(energyDescripText, 0, energyX + 8 * scaleWidth / 27, probabilityY + scaleHeight * 3);
  buildText(probabilityDescripText, 0, probabilityX + 6.5 * scaleWidth / 27, probabilityY + scaleHeight * 3);

}

/*
 * Creates the labels for the probability scale in the legend.
 */
function makeTicks(probabilityX, scaleWidth, probabilityY, legend) {
  const highProb = scaleBand()
    .domain(['6.5%'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${probabilityX + scaleWidth}, ${probabilityY})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisTop(highProb)
    .tickSize(60));

  const lowProb = scaleBand()
    .domain(['10 ^ -8 %'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${probabilityX}, ${probabilityY})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisTop(lowProb)
    .tickSize(60));

  const negativeSeventh = scaleBand()
    .domain(['10 ^ -7 %'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${probabilityX + scaleWidth / 8}, ${probabilityY})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisTop(negativeSeventh)
    .tickSize(60));

  const negativeSixth = scaleBand()
    .domain(['10 ^ -6 %'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${probabilityX + scaleWidth / 4}, ${probabilityY})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisTop(negativeSixth)
    .tickSize(60));

  const negativeFifth = scaleBand()
    .domain(['10 ^ -5 %'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${probabilityX + 3 * scaleWidth / 8}, ${probabilityY})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisTop(negativeFifth)
    .tickSize(60));

  const negativeFourth = scaleBand()
    .domain(['10 ^ -4 %'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${probabilityX + 4 * scaleWidth / 8}, ${probabilityY})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisTop(negativeFourth)
    .tickSize(60));

  const negativeThird = scaleBand()
    .domain(['10 ^ -3 %'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${probabilityX + 5 * scaleWidth / 8}, ${probabilityY})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisTop(negativeThird)
    .tickSize(60));

  const negativepointO1 = scaleBand()
    .domain(['0.01 %'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${probabilityX + 6 * scaleWidth / 8}, ${probabilityY})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisTop(negativepointO1)
    .tickSize(60));

  const negativepoint1 = scaleBand()
    .domain(['0.1%'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${probabilityX + 7 * scaleWidth / 8}, ${probabilityY})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisTop(negativepoint1)
    .tickSize(60));

  // red legend indicator
  legend.append('circle')
    .attr('r', 75)
    .attr('fill', '#aa0000')
    .attr('transform', `translate(${probabilityX + 137.059}, ${probabilityY + 2.5 * 137.059})`);

  legend.append('text')
    .text(' - Circles of this color encode objects that have already impacted Earth')
    .style('font-size', '2.5em')
    .attr('transform', `translate(${probabilityX + 137.059 + 100}, ${probabilityY + 2.5 * 137.059})`);
}

/*
 * Creates the labels for the Damage Scale in the legend.
 */
function makeLabels(damageScale, energyX, energyY, scaleHeight, scaleWidth, legend) {
  // setting the labeled tick marks on the energy scale. the scaleBand puts in the name and the
  // legend.append adds it to the svg and sets font size, and tick length, and position
  const oneUnit = scaleBand()
    .domain(['1 Damage Unit'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${energyX + damageScale(7812.5)},
      ${energyY})`)
    .style('font-size', '40')
    .style('font-weight', 'bold')
    .attr('font-family', 'Helvetica')
    .call(axisTop(oneUnit)
    .tickSize(60));

  const oneHundredUnit = scaleBand()
    .domain(['100 Damage Units'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${energyX + scaleWidth},
      ${energyY})`)
    .style('font-size', '40')
    .style('font-weight', 'bold')
    .attr('font-family', 'Helvetica')
    .call(axisTop(oneHundredUnit)
    .tickSize(60));

  const Chicxulub = scaleBand()
    .domain(['Chicxulub'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${energyX + scaleWidth},
      ${energyY + 1.00 * Number(scaleHeight)})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisBottom(Chicxulub)
    .tickSize(60));

  const Peru = scaleBand()
    .domain(['Peru Meteor'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(
      ${energyX + damageScale(1.21203 * Math.pow(10, -6))},
      ${energyY + scaleHeight})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisBottom(Peru)
    .tickSize(60));

  const Chelyabinsk = scaleBand()
    .domain(['Chelyabinsk'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${energyX + damageScale(0.0032)}, ${energyY})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisTop(Chelyabinsk)
    .tickSize(60));

  const MeteorCrater = scaleBand()
    .domain(['Meteor Crater'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${energyX + damageScale(0.02048)}, ${energyY + scaleHeight})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisBottom(MeteorCrater)
    .tickSize(180));

  const mostDamage = scaleBand()
    .domain(['Most Damaging Potential Impactor'])
    .range([0, 0]);

  legend.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${energyX + damageScale(4362.656)}, ${energyY + scaleHeight})`)
    .style('font-size', '40')
    .attr('font-family', 'Helvetica')
    .call(axisBottom(mostDamage)
    .tickSize(60));

}

/*
 * Returns the data point with the highest impact probability that is not
 * a previous impact data point.
 */
function findMostProbable(data) {
  let maxProbability = -Infinity;
  let mostProbable;

  data.forEach((d) => {
    const probability = d['Cumulative Impact Probability'];
    if (probability > maxProbability && probability < 1) {
      maxProbability = probability;
      mostProbable = d;
    }
  });

  return mostProbable;
}

/*
 * Returns the data point for the asteroid with the greatest potential impact
 * energy.
 */
function findMostDangerous(data) {
  let maxDamage = -Infinity;
  let mostDangerous;

  data.forEach((d) => {
    if (d.Energy > maxDamage) {
      maxDamage = d.Energy;
      mostDangerous = d;
    }
  });

  return mostDangerous;
}

/*
 * Helper function that builds an annotation object for use in the
 * createAnnotation function given a name, title, and description.
 */
function getAnnotationObject(name, title, desc) {
  const meteor = select(name);
  const info = {
    title,
    label: desc
  };

  return {node: meteor, info};
}

/*
 * Creates the annotations for the noteworthy nodes: previous impactors,
 * the possible impactor with the highest possibility of impact, and the
 * asteroid that would cause the most damage if it impacted.
 */
function createAnnotations(datavis, height, data, width) {
  const peru = getAnnotationObject('.Peru-Meteor', '2007 Peru Meteor',
    `The Peru meteor touched down in Carancas close to Lake Titicaca on
    September 15, 2007. The atmosphere absorbed most of the energy; a villager
    was 100 meters away from the site of impact and only fell off his bike
    without injury.`
  );

  const sikhote = getAnnotationObject('.Sikhote-Alin-meteor', 'Sikhote-Alin Meteor',
    `The impactor broke into lots of pieces in Earth’s atmosphere.
    Fragments were found in an area 1.3 square kilometers, and the
    largest impact crater was 26 meters.`
  );

  const tc3 = getAnnotationObject('.TC3', '2008 TC3',
      `This asteroid was discovered 19 hours before it touched down on the earth.
      It exploded 37 km above the Earth and rained over 600 fragments across the
      Nubian desert in Sudan.`
  );

  const tunguska = getAnnotationObject('.Tunguska-event', 'Tunguska Event',
    `Due to the blast created, some 80 million trees were knocked down
    over an area of 2,150 square kilometers. The impact was in
    in remote Siberia and no casualties were reported.`
  );

  const chelyabinsk = getAnnotationObject('.Chelyabinsk', 'Chelyabinsk Meteor',
    `The Chelyabinsk meteor touched down on February 15, 2013. The impact
    resulted in over 1,400 indirect injuries from the air burst created,
    and 112 people were hospitalized.`
  );

  const meteorCrater = getAnnotationObject('.Meteor-Crater', 'Arizona Meteor Crater',
    `Meteor crater, located in the northern Arizona desert, was created by
    this impactor that touched Earth 50,000 years ago. The crater is
    over a kilometer in diameter.`
  );

  const mostProbable = findMostProbable(data);
  const mostDangerous = findMostDangerous(data);

  const mostDangerousNode = getAnnotationObject(`#asteroid-${mostDangerous['Object Name']}`,
    mostDangerous['Object Name'],
    `Asteroid that would cause the most damage. Probability of impact is 1.8 10^-6%,
    38 possible impacts between the years 2020-2112,
    velocity - 25.22 km/s, diameter - 1.9 km`
  );

  const mostProbableNode = getAnnotationObject(`#asteroid-${mostProbable['Object Name']}`,
    mostProbable['Object Name'],
    `Asteroid with highest possibility of impact: 6.5%,
    52 possible impacts between 2095-2115, velocity - 5.1 km/s,
    diameter - 7 meters`
  );

  const chicxulub = getAnnotationObject('.dinosaur-asteroid', 'Chicxulub Impactor',
    `An asteroid 10 - 15km in diameter which is widely believed
    to have been responsible for a mass extinction event that wiped out
    75% of all plant and animal life on Earth.`
  );

  mostDangerousNode.node.node().classList.add(mostDangerous['Object Name']);
  mostProbableNode.node.node().classList.add(mostProbable['Object Name']);

  createAnnotation(peru, 0, -1000, datavis, height);
  createAnnotation(sikhote, 250, -500, datavis, height);
  createAnnotation(mostProbableNode, 0, 500, datavis, height);
  createAnnotation(tc3, 500, 750, datavis, height);
  createAnnotation(tunguska, 0, -1000, datavis, height);
  createAnnotation(chelyabinsk, 250, -1000, datavis, height);
  createAnnotation(meteorCrater, 0, 800, datavis, height);
  createAnnotation(mostDangerousNode, -500, 600, datavis, height);
  createAnnotation(chicxulub, -800, 800, datavis, height);
}

/*
 * Creates an annotation for the given meteor with the given meteorInfo.
 */
function createAnnotation(meteor, offsetX, offsetY, datavis, height) {
  const x = Number(meteor.node.node().getAttribute('cx'));
  const y = Number(meteor.node.node().getAttribute('cy'));
  const annotationInfo = [{
    note: {
      label: meteor.info.label,
      title: meteor.info.title
    },
    dy: offsetY,
    dx: offsetX,
    x,
    y,
    color: '#000000'
  }];

  const makeAnnotation = annotation()
    .editMode(true)
    .type(annotationLabel)
    .textWrap(500)
    .annotations(annotationInfo);
  datavis.append('g')
    .attr('transform', `translate(0, ${height * 3 / 8})`)
    .attr('font-size', 40)
    .attr('font-family', 'Helvetica')
    .call(makeAnnotation);
}

/*
 * Creates a gradient line that points out direction of increasing damage
 * on the x axis for the visualization.
 */
function buildDamageLine(poster, height, width) {
  const energyLine = poster.append('g')
    .attr('class', 'energy-scale-line');

  energyLine.append('defs')
    .append('marker')
    .attr('id', 'arrow')
    .attr('markerWidth', 10)
    .attr('markerHeight', 10)
    .attr('refX', 0)
    .attr('refY', 3)
    .attr('orient', 'auto')
    .attr('markerUnits', 'strokeWidth')
    .append('path')
    .attr('d', 'M0,0, L0,6 L9,3 z')
    .attr('fill', '#000');

  energyLine.append('line')
    .attr('x1', 400)
    .attr('x2', width - 400)
    .attr('y1', height * 9 / 12 - 100)
    .attr('y2', height * 9 / 12 - 100)
    .attr('stroke', '#000000')
    .attr('stroke-width', 10)
    .attr('marker-end', 'url(#arrow)');

  poster.append('text')
    .text('Increasing Damage')
    .attr('x', ((width - 400 - 400) / 2))
    .attr('y', height * 9 / 12)
    .attr('font-size', 100)
    .attr('font-family', 'Helvetica');
}

/*
 * Places a line on the Y-axis that points out the direction of
 * decreasing probability along the Y-axis for the visualization.
 */
function buildProbabilityLine(poster, height, width) {
  const probLine = poster.append('g')
    .attr('class', 'probability-line');

  const defs = probLine.append('defs');
  defs.append('marker')
    .attr('id', 'prob-arrow')
    .attr('markerWidth', 10)
    .attr('markerHeight', 10)
    .attr('refX', 0)
    .attr('refY', 3)
    .attr('orient', 'auto')
    .attr('markerUnits', 'strokeWidth')
    .append('path')
    .attr('d', 'M0,0, L0,6 L9,3 z')
    .attr('fill', '#000');
  defs.append('marker');

  probLine.append('line')
    .attr('x1', 350)
    .attr('x2', 350)
    .attr('y1', height * (5.5 / 12))
    .attr('y2', height * (5.5 / 12) - 1000)
    .attr('stroke', '#000000')
    .attr('stroke-width', 10)
    .attr('marker-end', 'url(#prob-arrow)');

  probLine.append('line')
    .attr('x1', 350)
    .attr('x2', 350)
    .attr('y1', height * (5.5 / 12))
    .attr('y2', height * (5.5 / 12) + 1000)
    .attr('stroke', '#000000')
    .attr('stroke-width', 10)
    .attr('marker-end', 'url(#prob-arrow)');
  probLine.append('text')
    .text('High Probability')
    .attr('x', 0)
    .attr('y', height * (5.5 / 12))
    .attr('font-size', 50)
    .attr('font-family', 'Helvetica');
  probLine.append('text')
    .text('Low Probability')
    .attr('x', 0)
    .attr('y', height * (5.5 / 12) + 950)
    .attr('font-size', 50)
    .attr('font-family', 'Helvetica');
  probLine.append('text')
    .text('Low Probability')
    .attr('x', 0)
    .attr('y', height * (5.5 / 12) - 950)
    .attr('font-size', 50)
    .attr('font-family', 'Helvetica');
}
