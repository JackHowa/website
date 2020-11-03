/* eslint-disable no-restricted-syntax */
import React, { useEffect } from 'react'
import classnames from 'classnames'
import { navigate } from 'gatsby'
import NProgress from 'nprogress'
import withSearch from '~components/utils/with-search'
import SearchNoResults from '~components/search/search-no-results'
import SearchResultSection from '~components/search/search-result-section'
import searchStyle from './search.module.scss'

import SearchAutocomplete from '~components/layout/header/search/search-autocomplete'
import SearchButton from '~components/layout/header/search/search-button'
import headerSearchStyle from '~components/layout/header/search/search.module.scss'

import {
  types,
  useSearch,
  querySearch,
  getHighlightResultOrExcerpt,
  getSanitizedSlug,
} from '~context/search-context'

const Search = withSearch(({ mobile, popoverRef, search }) => {
  const [searchState, searchDispatch] = useSearch()
  const { query, results } = searchState

  function setQuery(value) {
    NProgress.start()
    return searchDispatch({ type: 'setQuery', payload: value })
  }

  useEffect(() => {
    if (search.q) {
      setQuery(search.q)
    }
    searchDispatch({
      type: 'setAutocompleteFocus',
      hasFocus: true, // always focused
    })
  }, [])

  useEffect(() => {
    if (query) {
      querySearch(searchState, searchDispatch)
    }
  }, [query])

  const totalHits =
    query &&
    (results[types.STATE].nbHits || 0) +
      (results[types.BLOG_POST].nbHits || 0) +
      (results[types.PAGE].nbHits || 0)

  let searchEvent

  // todo stop from freezing up when pushing enter

  return (
    <div className={searchStyle.wrapper}>
      <div className={classnames(headerSearchStyle.search, searchStyle.search)}>
        <SearchAutocomplete
          ref={popoverRef}
          mobile={mobile}
          visible
          onChangeInput={event => {
            clearTimeout(searchEvent)
            const { value } = event.currentTarget
            searchEvent = setTimeout(() => {
              setQuery(value)
              window.history.pushState('', '', `?q=${value}`)
            }, 300)
          }}
        />

        <SearchButton onClick={() => query && navigate(`/search?q=${query}`)} />
      </div>
      {totalHits > 0 ? (
        <>
          <span className={searchStyle.resultsLabel}>
            <strong>{totalHits}</strong> {totalHits === 1 ? 'result' : 'results'} found
          </span>
          <div className={searchStyle.searchResults}>
            {/* State results */}
            <SearchResultSection
              query={query}
              results={results[types.STATE]}
              type="State"
              itemKey={state => state.state}
              itemTitle={state => state.name}
              itemUrl={state => getSanitizedSlug(types.STATE, state)}
              itemPublishDate={post => post.updatedAt}
              itemContent={post => (
                <div
                  dangerouslySetInnerHTML={{
                    __html: getHighlightResultOrExcerpt('state', post),
                  }}
                />
              )}
            />

            {/* Blog post results */}
            <SearchResultSection
              query={query}
              results={results[types.BLOG_POST]}
              type="Blog post"
              itemKey={post => post.objectID}
              itemTitle={post => post.title}
              itemUrl={post => getSanitizedSlug(types.BLOG_POST, post)}
              itemPublishDate={post => post.updatedAt}
              itemAuthor={post => post.author_name}
              itemContent={post => (
                <>
                  <p>{post.lede}</p>
                </>
              )}
            />

            {/* Pages results */}
            <SearchResultSection
              query={query}
              results={results[types.PAGE]}
              type="Page"
              itemKey={page => page.objectID}
              itemTitle={page => page.title}
              itemUrl={page => getSanitizedSlug(types.PAGE, page)}
              itemPublishDate={page => page.updatedAt}
              itemContent={page => (
                <div
                  dangerouslySetInnerHTML={{
                    __html: getHighlightResultOrExcerpt('page', page),
                  }}
                />
              )}
            />
          </div>
        </>
      ) : (
        <SearchNoResults query={query} />
      )}
    </div>
  )
})

export default Search
