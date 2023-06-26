/*
  UI Resources  
*/
//Preact
import {h, Component, render} from 'https://unpkg.com/preact?module';
import htm from 'https://unpkg.com/htm?module';
// Initialize htm with Preact
const html = htm.bind(h);

/*
  DATA
*/

//import XYZ from "./abc.js"

/*
  Declare the main App 
*/

class App extends Component {
  constructor() {
    super();
    this.state = {};

    //sub ui components 
    this.UI = {
      h,
      Component,
      render,
      html
    }

  }

  // Lifecycle: Called whenever our component is created
  componentDidMount() {}

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {}

  render(props, state) {
    return html`
      <div>
        <h1 class="pa2 z-2">Project 777</h1>
        <div class="flex justify-center absolute top-0 w-100 z-0">
          <img src="example_map.svg" alt="Example Map"></img>
        </div>
      </div>
      `
  }
}

render(html`<${App}/>`, document.body);
