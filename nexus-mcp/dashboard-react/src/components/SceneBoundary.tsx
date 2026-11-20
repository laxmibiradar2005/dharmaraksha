import {useLanguage} from '../context/languageState'
import { Component, type ReactNode } from 'react'
import Icon from './Icon'

export function SceneFallback() {
  const {t}=useLanguage()
  return <div className="scene-fallback"><div className="fallback-seal"><Icon name="scales" size={118} /></div><span>{t("Clarity. Balance. Justice.")}</span></div>
}

export default class SceneBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? (this.props.fallback ?? <SceneFallback />) : this.props.children }
}
