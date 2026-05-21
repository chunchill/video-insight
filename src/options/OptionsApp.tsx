import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createProviderConfig, validateProviderConfig } from "../providers/providerConfig";
import type { OutputLanguage } from "../shared/types";
import { getProviderSettings, saveProviderSettings } from "../storage/providerStorage";

interface ProviderFormState {
  id?: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

const emptyProviderForm: ProviderFormState = {
  name: "",
  baseUrl: "",
  apiKey: "",
  model: ""
};

export function OptionsApp() {
  const [providerForm, setProviderForm] = useState<ProviderFormState>(emptyProviderForm);
  const [defaultLanguage, setDefaultLanguage] = useState<OutputLanguage>("zh-CN");
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const settings = await getProviderSettings();
      if (!isMounted) {
        return;
      }

      const provider =
        settings.providers.find((item) => item.id === settings.selectedProviderId) ?? settings.providers[0];
      if (provider) {
        setProviderForm({
          id: provider.id,
          name: provider.name,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: provider.model
        });
      }
      setDefaultLanguage(settings.defaultLanguage);
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField(field: keyof ProviderFormState, value: string) {
    setProviderForm((current) => ({ ...current, [field]: value }));
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const settings = await getProviderSettings();
    const existingProvider = providerForm.id
      ? settings.providers.find((provider) => provider.id === providerForm.id)
      : undefined;
    const provider = createProviderConfig({
      ...providerForm,
      id: existingProvider?.id ?? providerForm.id,
      enabled: existingProvider?.enabled
    });
    const validationErrors = validateProviderConfig(provider);
    setErrors(validationErrors);
    setSuccessMessage("");

    if (validationErrors.length > 0) {
      return;
    }

    const providers = existingProvider
      ? settings.providers.map((currentProvider) => (currentProvider.id === provider.id ? provider : currentProvider))
      : [...settings.providers, provider];

    await saveProviderSettings({
      providers,
      selectedProviderId: provider.id,
      defaultLanguage
    });
    setProviderForm({
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.model
    });
    setSuccessMessage("Settings saved.");
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Settings</h1>
        <p>API keys are stored locally in this browser extension. Video transcripts are sent to the selected provider.</p>
      </header>

      <form className="settings-form" onSubmit={handleSubmit}>
        <label>
          Provider name
          <input
            type="text"
            value={providerForm.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="SiliconFlow"
          />
        </label>

        <label>
          Base URL
          <input
            type="url"
            value={providerForm.baseUrl}
            onChange={(event) => updateField("baseUrl", event.target.value)}
            placeholder="https://api.siliconflow.cn/v1"
          />
        </label>

        <label>
          API key
          <input
            type="password"
            value={providerForm.apiKey}
            onChange={(event) => updateField("apiKey", event.target.value)}
            autoComplete="off"
          />
        </label>

        <label>
          Model
          <input
            type="text"
            value={providerForm.model}
            onChange={(event) => updateField("model", event.target.value)}
            placeholder="Qwen/Qwen2.5-72B-Instruct"
          />
        </label>

        <label>
          Default output language
          <select
            value={defaultLanguage}
            onChange={(event) => {
              setDefaultLanguage(event.target.value as OutputLanguage);
              setSuccessMessage("");
            }}
          >
            <option value="zh-CN">中文</option>
            <option value="en">English</option>
          </select>
        </label>

        {errors.length > 0 ? (
          <div className="error-box" role="alert">
            <ul className="insight-list">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {successMessage ? <p className="success-message">{successMessage}</p> : null}

        <button className="primary-button" type="submit">
          Save provider
        </button>
      </form>
    </main>
  );
}
