import React from "react";

const SimpleAlternative = () => {
  return React.createElement("div", { 
    className: "min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8" 
  }, 
    React.createElement("div", { className: "max-w-4xl mx-auto text-center" },
      React.createElement("h1", { 
        className: "text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8" 
      }, "Balzac Education"),
      React.createElement("p", { 
        className: "text-2xl text-gray-600 mb-12" 
      }, "Version alternative de la homepage créée sans JSX"),
      React.createElement("div", { className: "grid md:grid-cols-3 gap-8 mt-16" },
        React.createElement("div", { className: "bg-white p-8 rounded-2xl shadow-lg" },
          React.createElement("h3", { className: "text-2xl font-bold mb-4" }, "Formation Progressive"),
          React.createElement("p", { className: "text-gray-600" }, "Un parcours structuré avec des sessions d'entraînement adaptées à votre niveau")
        ),
        React.createElement("div", { className: "bg-white p-8 rounded-2xl shadow-lg" },
          React.createElement("h3", { className: "text-2xl font-bold mb-4" }, "Certification Reconnue"),
          React.createElement("p", { className: "text-gray-600" }, "Obtenez une certification officiellement reconnue par les professionnels du secteur")
        ),
        React.createElement("div", { className: "bg-white p-8 rounded-2xl shadow-lg" },
          React.createElement("h3", { className: "text-2xl font-bold mb-4" }, "Suivi Personnalisé"),
          React.createElement("p", { className: "text-gray-600" }, "Bénéficiez d'un accompagnement sur mesure tout au long de votre parcours")
        )
      )
    )
  );
};

export default SimpleAlternative;