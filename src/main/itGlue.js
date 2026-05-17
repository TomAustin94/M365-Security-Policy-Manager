const axios = require('axios')
const store = require('./store')

class ItGlueClient {
  constructor() {
    this._client = null
  }

  getClient() {
    const apiKey = store.get('itGlueApiKey')
    const baseURL = store.get('itGlueBaseUrl') || 'https://api.itglue.com'
    this._client = axios.create({
      baseURL,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/vnd.api+json',
      },
      timeout: 30000,
    })
    return this._client
  }

  async testConnection(apiKey) {
    const baseURL = store.get('itGlueBaseUrl') || 'https://api.itglue.com'
    try {
      const resp = await axios.get(`${baseURL}/organizations?page[size]=1`, {
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/vnd.api+json' },
        timeout: 10000,
      })
      const count = resp.data?.meta?.total_count || 0
      return { success: true, orgCount: count, message: `Connected — ${count} organisations found` }
    } catch (err) {
      return { success: false, orgCount: 0, message: err.response?.data?.message || err.message }
    }
  }

  async getOrganizations() {
    const client = this.getClient()
    let allOrgs = []
    let page = 1
    const pageSize = 100

    while (true) {
      const resp = await client.get(`/organizations?page[size]=${pageSize}&page[number]=${page}`)
      const data = resp.data?.data || []
      allOrgs = allOrgs.concat(data.map(o => ({
        id: o.id,
        name: o.attributes?.name || '',
        shortName: o.attributes?.short_name || '',
      })))
      const meta = resp.data?.meta
      if (!meta || page * pageSize >= meta.total_count) break
      page++
    }
    return allOrgs
  }

  async getPasswords(orgId) {
    const client = this.getClient()
    const resp = await client.get(`/passwords?filter[organization_id]=${orgId}&page[size]=100`)
    const data = resp.data?.data || []
    return data.map(p => ({
      id: p.id,
      name: p.attributes?.name || '',
      username: p.attributes?.username || '',
      resourceType: p.attributes?.resource_type || '',
      password: p.attributes?.password || '',
    }))
  }
}

const client = new ItGlueClient()
module.exports = client
