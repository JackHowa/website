import { nest } from 'd3-collection'
import { graphql, useStaticQuery } from 'gatsby'
import React, { useMemo, useState } from 'react'
import cloneDeep from 'lodash/cloneDeep'

import AreaChart from './charts/_AreaChart'
import StatesWithPopulation from '../../data/visualization/state-populations.json'

import {
  calculateTotal,
  getStateName,
  parseDate,
  totalColor,
  positiveColor,
} from './_utils'

import './dashboard.scss'

// these come from this google spreadsheet owned by Júlia Ledur
// https://docs.google.com/spreadsheets/d/1mD_NhlJR1fM2Pv_pY8YixUrX2p2F8rAE0xPTtsTJOiM/edit#gid=0
const stayAtHomeOrders = {
  AK: 20200328,
  AZ: 20200331,
  CA: 20200319,
  CO: 20200326,
  CT: 20200323,
  DC: 20200401,
  DE: 20200324,
  FL: 20200403,
  GA: 20200403,
  HI: 20200325,
  ID: 20200325,
  IL: 20200321,
  IN: 20200324,
  KS: 20200330,
  KY: 20200326,
  LA: 20200323,
  MA: 20200324,
  MD: 20200330,
  ME: 20200402,
  MI: 20200324,
  MN: 20200327,
  MS: 20200403,
  MT: 20200328,
  NC: 20200330,
  NH: 20200327,
  NJ: 20200321,
  NM: 20200324,
  NV: 20200401,
  NY: 20200322,
  OH: 20200323,
  OR: 20200323,
  PA: 20200401,
  PR: 20200315,
  RI: 20200328,
  TN: 20200331,
  VA: 20200330,
  VI: 20200321,
  VT: 20200325,
  WA: 20200323,
  WV: 20200324,
  WI: 20200325,
}

const statePopulations = StatesWithPopulation.features.reduce((acc, cur) => {
  acc[cur.properties.STUSPS] = cur.properties.population
  return acc
}, {})

const territoryPopulations = {
  GU: 164229,
  VI: 107268,
  MP: 55144,
  AS: 55641,
}

function sortGroupedData(groupedData) {
  return groupedData.sort((a, b) => {
    const lastA = a.values[0]
    const lastB = b.values[0]

    const lastATotal = calculateTotal(lastA)
    const lastBTotal = calculateTotal(lastB)
    return lastBTotal - lastATotal
  })
}

function groupAndSortStateDaily(query) {
  const data = query.allCovidStateDaily.edges.map(edge => {
    const { node } = edge
    return node
  })

  const grouped = nest()
    .key(d => d.state)
    .sortValues((a, b) => {
      const aDate = parseDate(a.date)
      const bDate = parseDate(b.date)

      if (aDate > bDate) return -1
      if (bDate > aDate) return 1
      return 0
    })
    .entries(data)

  const groupedPerCapita = grouped.map(stateData => {
    const population = statePopulations[stateData.key]
      ? statePopulations[stateData.key]
      : territoryPopulations[stateData.key]
    const clonedData = cloneDeep(stateData)

    clonedData.values = clonedData.values.map(value => {
      const clonedValue = cloneDeep(value)

      // divide by population to determine per capita percentages
      clonedValue.positive /= population
      clonedValue.negative /= population

      return clonedValue
    })

    return clonedData
  })

  return {
    totals: sortGroupedData(grouped),
    perCapita: sortGroupedData(groupedPerCapita),
  }
}

export default function CumulativeTestsByStateContainer() {
  const query = useStaticQuery(graphql`
    {
      allCovidStateDaily {
        edges {
          node {
            date
            state
            positive
            negative
          }
        }
      }
    }
  `)

  const [useTestsPerCapita, setUseTestsPerCapita] = useState(false)

  const toggleChartData = () => setUseTestsPerCapita(u => !u)

  const allData = useMemo(() => {
    return groupAndSortStateDaily(query)
  })

  const data = useMemo(() => {
    return useTestsPerCapita ? allData.perCapita : allData.totals
  })

  const maxStateTests = useMemo(() => {
    return calculateTotal(data[0].values[0])
  })

  return (
    <div>
      <p>
        By comparing the positive tests to the total tests in each state, we can
        get a sense of how widespread a state’s testing regime might be (though
        always remember to consider population densities vary wildly across the
        country) and if the number of positive tests is tracking roughly against
        the total number of tests. If it is, then we might consider that the
        state isn’t necessarily just getting new infections every day but that
        they’re also giving more tests.
      </p>
      <h3>Cumulative tests by state</h3>
      <div className="chart-controls">
        <ul className="chart-legend">
          <li>
            <span
              className="chart-legend-color"
              style={{ backgroundColor: positiveColor }}
            />
            Positive tests
          </li>
          <li>
            <span
              className="chart-legend-color"
              style={{ backgroundColor: totalColor }}
            />{' '}
            Total tests
          </li>
          <li>
            <span
              className="chart-legend-color"
              style={{
                backgroundColor: 'black',
                height: '20px',
                margin: '0 14px 0 0',
                verticalAlign: 'middle',
                width: '2px',
              }}
            />
            Stay-at-home order*
          </li>
        </ul>
        <div
          className="map-toggle chart-tests-toggle"
          onClick={toggleChartData}
          onKeyPress={toggleChartData}
          role="switch"
          aria-checked={useTestsPerCapita}
          tabIndex={0}
        >
          <span className={useTestsPerCapita ? '' : 'active'}>Total Tests</span>
          <span className={useTestsPerCapita ? 'active' : ''}>
            Tests Per Capita
          </span>
        </div>
      </div>
      <div className="small-multiples-chart-container">
        {data.map(state => {
          // because we're just charting two variables we make them here
          // we do this instead of creating two different area chart generators
          const stateData = []
          const stateName = getStateName(state.key)
          const stayAtHomeOrder = stayAtHomeOrders[state.key]
          const annotations = stayAtHomeOrder
            ? [{ date: parseDate(stayAtHomeOrder) }]
            : null

          state.values.forEach(d => {
            const date = parseDate(d.date)

            stateData.push({
              date,
              label: 'Positive',
              value: d.positive,
            })

            stateData.push({
              date,
              label: 'Total',
              value: calculateTotal(d),
            })
          })

          return (
            <div
              className="small-multiples-chart"
              data-state={state.key}
              key={state.key}
            >
              <h4>{stateName}</h4>
              <AreaChart
                annotations={annotations}
                data={stateData}
                fill={d => {
                  if (d === 'Total') return '#585BC1'
                  return '#FFA270'
                }}
                height={500}
                labelOrder={['Total', 'Positive']}
                marginTop={10}
                xTicks={4}
                width={750}
                yMax={maxStateTests}
                yTicks={2}
                showTicks={false}
              />
              <p>
                <a
                  className="small-multiples-chart__see-all-link"
                  href={`/data/state/${stateName
                    .toLowerCase()
                    .replace(/\s/g, '-')}`}
                >
                  See all data from
                  {` ${stateName.replace(/\s/g, ' ')}`}
                </a>
              </p>
            </div>
          )
        })}
      </div>
      <p className="chart-legend-note">
        <b>*</b> Only statewide stay-at-home orders are included; dates mark
        when the orders went into effect.
      </p>
    </div>
  )
}
